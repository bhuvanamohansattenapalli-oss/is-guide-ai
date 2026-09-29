import { prisma } from '@/lib/prisma'
import {
  RequirementCategory,
  RelationshipType,
  EvidenceType,
  CertificationCheckStatus,
  AnalysisStatus,
  StandardStatus,
} from '@prisma/client'

export interface ExtractedRequirementData {
  category: RequirementCategory
  name: string
  value: string
  unit?: string
  isMandatory: boolean
  confidence: number
}

export interface RecommendationResult {
  requirements: Array<{
    id: string
    category: RequirementCategory
    name: string
    value: string
    unit: string | null
    isMandatory: boolean
    confidence: number
  }>
  recommendations: Array<{
    id: string
    rank: number
    score: number
    relevanceScore?: number
    systemRelevanceScorePercent: number
    scoreLabel: string
    reason: string
    isMandatory: boolean
    standard: {
      id: string
      standardNumber: string
      title: string
      shortTitle: string | null
      category: string
      status: string
      scope: string
      sourceUrl: string | null
      currentVersion: {
        versionLabel: string
        publicationDate: Date | null
        status: string
      } | null
      versions: Array<{
        versionLabel: string
        publicationDate: Date | null
        status: string
      }>
      amendments: Array<{
        amendmentNumber: string
        publicationDate: Date | null
        description: string | null
      }>
    }
    evidence: Array<{
      requirementName: string
      requirementValue: string
      evidenceType: EvidenceType
      notes: string | null
    }>
    relatedStandards: {
      normativeReferences: Array<{ standardNumber: string; title: string; description: string; sourceReference: string }>
      testMethods: Array<{ standardNumber: string; title: string; description: string; sourceReference: string }>
      safetyStandards: Array<{ standardNumber: string; title: string; description: string; sourceReference: string }>
      installationStandards: Array<{ standardNumber: string; title: string; description: string; sourceReference: string }>
      relatedStandards: Array<{ standardNumber: string; title: string; description: string; sourceReference: string }>
    }
  }>
  certifications: Array<{
    id: string
    schemeName: string
    category: string
    description: string | null
    status: CertificationCheckStatus
    statusLabel: string
    notes: string | null
  }>
  warnings: string[]
  report?: {
    id: string
    title: string
    summary: string
    findings: any
  }
}

let cachedStandards: any[] | null = null
let cacheExpiry = 0

async function getStandardsCatalog() {
  if (cachedStandards && Date.now() < cacheExpiry) {
    return cachedStandards
  }
  const standards = await prisma.standard.findMany({
    where: { status: StandardStatus.ACTIVE },
    include: {
      versions: {
        orderBy: { publicationDate: 'desc' },
      },
      amendments: {
        orderBy: { amendmentNumber: 'asc' },
      },
      outgoingRelationships: {
        include: {
          targetStandard: {
            select: {
              standardNumber: true,
              title: true,
            },
          },
        },
      },
      incomingRelationships: {
        include: {
          sourceStandard: {
            select: {
              standardNumber: true,
              title: true,
            },
          },
        },
      },
    },
  })
  cachedStandards = standards
  cacheExpiry = Date.now() + 1000 * 60 * 15 // 15 mins cache
  return standards
}

/**
 * Rapid Recommendation Service for IS-Guide AI (SIH Prototype)
 * Integrates deterministic keyword/ontology extraction, PostgreSQL standards matching,
 * cross-standard relationship traversal, and certification validation.
 */
export class RecommendationService {
  /**
   * Complete End-to-End Processing of a Procurement Specification
   */
  static async processAnalysis(analysisId: string): Promise<RecommendationResult> {
    // 1. Fetch analysis
    const analysis = await prisma.procurementAnalysis.findUnique({
      where: { id: analysisId },
    })

    if (!analysis) {
      throw new Error(`Analysis with ID ${analysisId} not found`)
    }

    // Set status to PROCESSING
    await prisma.procurementAnalysis.update({
      where: { id: analysisId },
      data: { status: AnalysisStatus.PROCESSING },
    })

    try {
      const rawText = analysis.rawInput || ''

      // 2. Extract technical requirements
      const extractedData = await this.extractRequirements(rawText)

      // Clear any prior extracted requirements for this analysis (idempotent)
      await prisma.extractedRequirement.deleteMany({
        where: { analysisId },
      })

      // Persist Extracted Requirements
      const createdRequirements = await Promise.all(
        extractedData.map((req) =>
          prisma.extractedRequirement.create({
            data: {
              analysisId,
              category: req.category,
              name: req.name,
              value: req.value,
              unit: req.unit || null,
              description: req.isMandatory ? 'Mandatory specification clause' : 'Recommended specification clause',
              confidence: req.confidence,
            },
          })
        )
      )

      // 3. Load Verified Standards with Versions, Amendments, and Relationships (Cached)
      const standards = await getStandardsCatalog()

      // 4. Deterministic Scoring Algorithm
      const scoredStandards = this.scoreStandards(rawText, extractedData, standards)

      // 5. Clear prior recommendations & evidence
      await prisma.recommendation.deleteMany({
        where: { analysisId },
      })

      // 6. Save Recommendations & Evidence in Batch
      const savedRecommendations: RecommendationResult['recommendations'] = []
      const evidenceToBatch: any[] = []

      for (let i = 0; i < scoredStandards.length; i++) {
        const item = scoredStandards[i]
        const rank = i + 1

        const rec = await prisma.recommendation.create({
          data: {
            analysisId,
            standardId: item.standard.id,
            rank,
            relevanceScore: item.score,
            confidenceScore: item.score,
            reason: item.reason,
          },
        })

        // Collect evidence
        const evidenceRecords: RecommendationResult['recommendations'][0]['evidence'] = []
        for (const ev of item.matchedRequirements) {
          const reqRecord = createdRequirements.find((r) => r.name === ev.reqName)
          if (reqRecord) {
            const evType = ev.type || EvidenceType.SPECIFICATION_MATCH
            const evText = ev.notes || 'Technical specification alignment identified for this standard.'
            evidenceToBatch.push({
              recommendationId: rec.id,
              requirementId: reqRecord.id,
              evidenceType: evType,
              evidenceText: evText,
              sourceReference: item.standard.standardNumber,
            })
            evidenceRecords.push({
              requirementName: reqRecord.name,
              requirementValue: reqRecord.value,
              evidenceType: evType,
              notes: evText,
            })
          }
        }

        // Categorize related standards
        const normativeReferences: Array<{ standardNumber: string; title: string; description: string; sourceReference: string }> = []
        const testMethods: Array<{ standardNumber: string; title: string; description: string; sourceReference: string }> = []
        const safetyStandards: Array<{ standardNumber: string; title: string; description: string; sourceReference: string }> = []
        const installationStandards: Array<{ standardNumber: string; title: string; description: string; sourceReference: string }> = []
        const relatedStandards: Array<{ standardNumber: string; title: string; description: string; sourceReference: string }> = []

        for (const rel of item.standard.outgoingRelationships) {
          const entry = {
            standardNumber: rel.targetStandard.standardNumber,
            title: rel.targetStandard.title,
            description: rel.description || '',
            sourceReference: rel.sourceReference || '',
          }
          if (rel.relationshipType === RelationshipType.NORMATIVE_REFERENCE) normativeReferences.push(entry)
          else if (rel.relationshipType === RelationshipType.TEST_METHOD) testMethods.push(entry)
          else if (rel.relationshipType === RelationshipType.SAFETY) safetyStandards.push(entry)
          else if (rel.relationshipType === RelationshipType.INSTALLATION) installationStandards.push(entry)
          else relatedStandards.push(entry)
        }

        const currentVersion = item.standard.versions.find((v: any) => v.status === 'CURRENT') || item.standard.versions[0] || null

        savedRecommendations.push({
          id: rec.id,
          rank,
          score: item.score,
          relevanceScore: item.score,
          systemRelevanceScorePercent: Math.round(item.score * 100),
          scoreLabel: 'System relevance score',
          reason: item.reason,
          isMandatory: item.isMandatory,
          standard: {
            id: item.standard.id,
            standardNumber: item.standard.standardNumber,
            title: item.standard.title,
            shortTitle: item.standard.shortTitle,
            category: item.standard.category,
            status: item.standard.status,
            scope: item.standard.scope,
            sourceUrl: item.standard.sourceUrl,
            currentVersion: currentVersion
              ? {
                  versionLabel: currentVersion.versionLabel,
                  publicationDate: currentVersion.publicationDate,
                  status: currentVersion.status,
                }
              : null,
            versions: item.standard.versions.map((v: any) => ({
              versionLabel: v.versionLabel,
              publicationDate: v.publicationDate,
              status: v.status,
            })),
            amendments: item.standard.amendments.map((a: any) => ({
              amendmentNumber: a.amendmentNumber,
              publicationDate: a.publicationDate,
              description: a.description,
            })),
          },
          evidence: evidenceRecords,
          relatedStandards: {
            normativeReferences,
            testMethods,
            safetyStandards,
            installationStandards,
            relatedStandards,
          },
        })
      }

      // Batch insert all evidence rows in one roundtrip
      if (evidenceToBatch.length > 0) {
        await prisma.recommendationEvidence.createMany({
          data: evidenceToBatch,
        })
      }

      // 7. Check Certifications & Compliance
      const certResults = await this.evaluateCertifications(analysisId, rawText, scoredStandards.map((s) => s.standard))

      // 8. Generate Warnings & Specification Gaps
      const warnings = this.generateWarnings(rawText, scoredStandards, certResults)

      // 9. Generate Report Record
      const report = await this.generateReport(analysisId, analysis.title, scoredStandards, certResults, warnings)

      // 10. Mark Analysis COMPLETED
      await prisma.procurementAnalysis.update({
        where: { id: analysisId },
        data: { status: AnalysisStatus.COMPLETED },
      })

      return {
        requirements: createdRequirements.map((r) => ({
          id: r.id,
          category: r.category,
          name: r.name,
          value: r.value,
          unit: r.unit,
          isMandatory: Boolean(r.description?.includes('Mandatory')),
          confidence: r.confidence || 0.9,
        })),
        recommendations: savedRecommendations,
        certifications: certResults,
        warnings,
        report,
      }
    } catch (err) {
      console.error('[RecommendationService.processAnalysis] Error:', err)
      await prisma.procurementAnalysis.update({
        where: { id: analysisId },
        data: { status: AnalysisStatus.FAILED },
      })
      throw err
    }
  }

  /**
   * Extract Technical Requirements using hybrid NLP patterns + AI augmentation
   */
  static async extractRequirements(text: string): Promise<ExtractedRequirementData[]> {
    const requirements: ExtractedRequirementData[] = []
    const lower = text.toLowerCase()

    // 1. Product Identification (Evaluate independent product domains)
    if (lower.includes('street light') || lower.includes('luminaire') || lower.includes('led fixture') || lower.includes('roadway light')) {
      requirements.push({
        category: RequirementCategory.PRODUCT,
        name: 'Product Type',
        value: 'Outdoor LED Street Lighting Luminaire',
        isMandatory: true,
        confidence: 0.98,
      })
    }
    if (lower.includes('ready-mixed concrete') || lower.includes('ready mixed concrete') || lower.includes('rmc') || lower.includes('reinforced concrete') || (lower.includes('concrete') && (lower.includes('grade m') || lower.includes('mix design') || lower.includes('compressive strength')))) {
      requirements.push({
        category: RequirementCategory.PRODUCT,
        name: 'Product Type',
        value: 'Plain and Reinforced Concrete / Ready-Mixed Concrete',
        isMandatory: true,
        confidence: 0.96,
      })
    }
    if (lower.includes('tmt') || lower.includes('rebar') || lower.includes('reinforcement steel') || lower.includes('deformed steel') || lower.includes('steel bar') || lower.includes('deformed bar')) {
      requirements.push({
        category: RequirementCategory.PRODUCT,
        name: 'Product Type',
        value: 'High Strength Deformed Steel Reinforcement (TMT)',
        isMandatory: true,
        confidence: 0.96,
      })
    }
    if (lower.includes('helmet') || lower.includes('hard hat') || lower.includes('head protection')) {
      requirements.push({
        category: RequirementCategory.PRODUCT,
        name: 'Product Type',
        value: 'Industrial Safety Helmet',
        isMandatory: true,
        confidence: 0.98,
      })
    }
    if (lower.includes('footwear') || lower.includes('safety shoe') || lower.includes('safety boot')) {
      requirements.push({
        category: RequirementCategory.PRODUCT,
        name: 'Product Type',
        value: 'Industrial Safety Footwear',
        isMandatory: true,
        confidence: 0.97,
      })
    }
    if (lower.includes('hdpe') || lower.includes('polyethylene pipe') || lower.includes('water supply pipe')) {
      requirements.push({
        category: RequirementCategory.PRODUCT,
        name: 'Product Type',
        value: 'High Density Polyethylene (HDPE) Potable Water Pipe',
        isMandatory: true,
        confidence: 0.97,
      })
    }
    if (lower.includes('fire extinguisher') || lower.includes('portable extinguisher')) {
      requirements.push({
        category: RequirementCategory.PRODUCT,
        name: 'Product Type',
        value: 'Portable Fire Extinguisher',
        isMandatory: true,
        confidence: 0.98,
      })
    }
    if (lower.includes('fire alarm') || lower.includes('smoke detector') || lower.includes('heat detector')) {
      requirements.push({
        category: RequirementCategory.PRODUCT,
        name: 'Product Type',
        value: 'Automatic Fire Detection and Alarm System',
        isMandatory: true,
        confidence: 0.95,
      })
    }
    if (lower.includes('water meter') || lower.includes('domestic water meter')) {
      requirements.push({
        category: RequirementCategory.PRODUCT,
        name: 'Product Type',
        value: 'Domestic Potable Water Meter',
        isMandatory: true,
        confidence: 0.96,
      })
    }

    // 2. Application
    const appMatch = text.match(/(?:for|application|intended for|usage)[:\s]+([^.,\n]+)/i)
    if (appMatch) {
      requirements.push({
        category: RequirementCategory.APPLICATION,
        name: 'Intended Application',
        value: appMatch[1].trim(),
        isMandatory: true,
        confidence: 0.88,
      })
    } else if (lower.includes('roadway') || lower.includes('street') || lower.includes('highway')) {
      requirements.push({
        category: RequirementCategory.APPLICATION,
        name: 'Intended Application',
        value: 'Public Roadway and Highway Infrastructure Illumination',
        isMandatory: true,
        confidence: 0.92,
      })
    } else if (lower.includes('bridge') || lower.includes('flyover') || lower.includes('structural')) {
      requirements.push({
        category: RequirementCategory.APPLICATION,
        name: 'Intended Application',
        value: 'Civil Infrastructure & Structural Concrete Elements',
        isMandatory: true,
        confidence: 0.91,
      })
    } else if (lower.includes('drinking water') || lower.includes('potable') || lower.includes('municipal')) {
      requirements.push({
        category: RequirementCategory.APPLICATION,
        name: 'Intended Application',
        value: 'Municipal Potable Drinking Water Distribution',
        isMandatory: true,
        confidence: 0.93,
      })
    }

    // 3. Materials
    if (lower.includes('pe 100') || lower.includes('pe100') || lower.includes('pe 80')) {
      requirements.push({
        category: RequirementCategory.MATERIAL,
        name: 'Raw Material Grade',
        value: 'Virgin Polyethylene PE 100 raw material compounding',
        isMandatory: true,
        confidence: 0.95,
      })
    }
    if (lower.includes('fe 500d') || lower.includes('fe 500') || lower.includes('fe 550d') || lower.includes('fe 415')) {
      const match = text.match(/fe\s*\d{3}[dD]?/i)
      requirements.push({
        category: RequirementCategory.MATERIAL,
        name: 'Steel Strength Grade',
        value: match ? match[0].toUpperCase() : 'Fe 500D',
        isMandatory: true,
        confidence: 0.95,
      })
    }
    if (lower.includes('aluminium') || lower.includes('die-cast') || lower.includes('die cast')) {
      requirements.push({
        category: RequirementCategory.MATERIAL,
        name: 'Luminaire Housing Material',
        value: 'High Pressure Die-Cast Aluminium Alloy with anti-corrosion coating',
        isMandatory: false,
        confidence: 0.9,
      })
    }
    if (lower.includes('opc 43') || lower.includes('43 grade')) {
      requirements.push({
        category: RequirementCategory.MATERIAL,
        name: 'Cement Type & Grade',
        value: 'OPC 43 Grade Cement',
        isMandatory: true,
        confidence: 0.92,
      })
    }

    // 4. Dimensions & Ratings
    const diaMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:mm|inch|in)\s*(?:dia|diameter|od|outer diameter)/i)
    if (diaMatch) {
      requirements.push({
        category: RequirementCategory.DIMENSION,
        name: 'Nominal Diameter',
        value: diaMatch[1] + ' mm',
        unit: 'mm',
        isMandatory: true,
        confidence: 0.93,
      })
    }
    const pnMatch = text.match(/PN\s*[-:]?\s*(\d+(?:\.\d+)?)/i)
    if (pnMatch) {
      requirements.push({
        category: RequirementCategory.DIMENSION,
        name: 'Pressure Rating',
        value: 'PN ' + pnMatch[1],
        unit: 'bar',
        isMandatory: true,
        confidence: 0.94,
      })
    }
    const wattMatch = text.match(/(\d+)\s*(?:w|watt|watts)\b/i)
    if (wattMatch) {
      requirements.push({
        category: RequirementCategory.ELECTRICAL,
        name: 'System Power Rating',
        value: wattMatch[1] + ' W',
        unit: 'W',
        isMandatory: true,
        confidence: 0.95,
      })
    }

    // 5. Performance
    const efficacyMatch = text.match(/(?:efficacy|lumen[s]?\/watt|lm\/w)[:\s]*([>=<~]*\s*\d+)/i)
    if (efficacyMatch) {
      requirements.push({
        category: RequirementCategory.PERFORMANCE,
        name: 'Luminous Efficacy',
        value: efficacyMatch[1].trim() + ' lm/W',
        unit: 'lm/W',
        isMandatory: true,
        confidence: 0.92,
      })
    }
    const strengthMatch = text.match(/\b(M\s*[-]?\s*\d{2,3})\b/i)
    if (strengthMatch) {
      requirements.push({
        category: RequirementCategory.PERFORMANCE,
        name: 'Characteristic Concrete Grade',
        value: strengthMatch[1].toUpperCase(),
        unit: 'MPa',
        isMandatory: true,
        confidence: 0.95,
      })
    }

    // 6. Electrical Characteristics
    if (lower.includes('power factor') || lower.includes('pf')) {
      const pfMatch = text.match(/(?:power factor|pf)[:\s]*([>=<~]*\s*0\.\d+)/i)
      requirements.push({
        category: RequirementCategory.ELECTRICAL,
        name: 'Power Factor',
        value: pfMatch ? pfMatch[1].trim() : '>= 0.95',
        isMandatory: true,
        confidence: 0.91,
      })
    }
    if (lower.includes('thd') || lower.includes('harmonics')) {
      const thdMatch = text.match(/(?:thd)[:\s]*([>=<~]*\s*\d+[\s]*%)/i)
      requirements.push({
        category: RequirementCategory.ELECTRICAL,
        name: 'Total Harmonic Distortion (THD)',
        value: thdMatch ? thdMatch[1].trim() : '<= 10%',
        isMandatory: false,
        confidence: 0.9,
      })
    }
    if (lower.includes('surge') || lower.includes('10kv') || lower.includes('4kv')) {
      requirements.push({
        category: RequirementCategory.ELECTRICAL,
        name: 'Surge Protection',
        value: 'Built-in Surge Protection Device (SPD) >= 10 kV',
        unit: 'kV',
        isMandatory: true,
        confidence: 0.93,
      })
    }

    // 7. Safety
    const ipMatch = text.match(/\bIP\s*[-:]?\s*(\d{2})\b/i)
    if (ipMatch) {
      requirements.push({
        category: RequirementCategory.SAFETY,
        name: 'Ingress Protection (IP Rating)',
        value: 'IP ' + ipMatch[1],
        isMandatory: true,
        confidence: 0.98,
      })
    } else if (lower.includes('weatherproof') || lower.includes('waterproof') || lower.includes('outdoor')) {
      requirements.push({
        category: RequirementCategory.SAFETY,
        name: 'Ingress Protection',
        value: 'Minimum IP 65 Dust & Moisture Ingress Protection',
        isMandatory: true,
        confidence: 0.85,
      })
    }
    if (lower.includes('impact') || lower.includes('ik08') || lower.includes('ik10')) {
      requirements.push({
        category: RequirementCategory.SAFETY,
        name: 'Mechanical Impact Protection',
        value: 'IK 08 or higher impact resistance',
        isMandatory: false,
        confidence: 0.89,
      })
    }

    // 8. Testing & Quality Control
    if (lower.includes('salt spray') || lower.includes('corrosion test')) {
      requirements.push({
        category: RequirementCategory.TESTING,
        name: 'Corrosion Endurance Test',
        value: 'Neutral Salt Spray Testing >= 1,000 Hours',
        isMandatory: true,
        confidence: 0.91,
      })
    }
    if (lower.includes('hydrostatic') || lower.includes('pressure test')) {
      requirements.push({
        category: RequirementCategory.TESTING,
        name: 'Internal Hydrostatic Pressure Test',
        value: 'Long-term hydrostatic strength verification at 80°C (165h & 1000h)',
        isMandatory: true,
        confidence: 0.92,
      })
    }
    if (lower.includes('slump') || lower.includes('workability')) {
      requirements.push({
        category: RequirementCategory.TESTING,
        name: 'Fresh Concrete Workability',
        value: 'Slump Retention / Flowability testing at delivery point',
        isMandatory: true,
        confidence: 0.88,
      })
    }

    // 9. Certification Requirements
    if (lower.includes('bis') || lower.includes('isi') || lower.includes('qco') || lower.includes('crs')) {
      requirements.push({
        category: RequirementCategory.CERTIFICATION,
        name: 'Mandatory Standards Conformity',
        value: 'BIS Certification (ISI Mark or CRS as applicable under Govt QCO)',
        isMandatory: true,
        confidence: 0.99,
      })
    } else {
      // Default statutory requirement
      requirements.push({
        category: RequirementCategory.CERTIFICATION,
        name: 'Statutory Conformity',
        value: 'Verification against applicable Bureau of Indian Standards (BIS) Quality Control Orders',
        isMandatory: true,
        confidence: 0.85,
      })
    }

    // If Gemini key is available, run an asynchronous semantic pass to enrich requirements
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (geminiKey && text.length > 30) {
      try {
        const enriched = await this.enrichRequirementsWithAI(text, geminiKey)
        if (enriched && Array.isArray(enriched) && enriched.length > 0) {
          for (const item of enriched) {
            const exists = requirements.some(
              (r) => r.name.toLowerCase() === item.name.toLowerCase() || r.value.toLowerCase() === item.value.toLowerCase()
            )
            if (!exists) {
              requirements.push(item)
            }
          }
        }
      } catch (aiErr) {
        console.warn('[RecommendationService.extractRequirements] Gemini semantic pass skipped/failed, using deterministic rules:', (aiErr as Error).message)
      }
    }

    return requirements
  }

  /**
   * Deterministic Standard Matching & Relevance Scoring
   */
  private static scoreStandards(
    rawText: string,
    requirements: ExtractedRequirementData[],
    standards: any[]
  ): Array<{
    standard: any
    score: number
    reason: string
    isMandatory: boolean
    matchedRequirements: Array<{ reqName: string; type: EvidenceType; notes: string }>
  }> {
    const lowerText = rawText.toLowerCase()
    const results: Array<{
      standard: any
      score: number
      reason: string
      isMandatory: boolean
      matchedRequirements: Array<{ reqName: string; type: EvidenceType; notes: string }>
    }> = []

    for (const std of standards) {
      let score = 0
      const matchedRequirements: Array<{ reqName: string; type: EvidenceType; notes: string }> = []
      const matchReasons: string[] = []

      const stdNumLower = std.standardNumber.toLowerCase()
      const titleLower = std.title.toLowerCase()
      const scopeLower = std.scope.toLowerCase()
      const categoryLower = std.category.toLowerCase()

      // 1. Direct Standard Identifier Mention in Spec Text (+0.50 score)
      // Normalize numbers for matching, e.g. "is 10322", "is456", "10322", "is 1786"
      const cleanStdNum = stdNumLower.replace(/\s+/g, ' ')
      const numOnly = std.standardNumber.replace(/[^0-9]/g, '')
      if (
        lowerText.includes(cleanStdNum) ||
        (numOnly.length >= 3 && lowerText.includes(stdNumLower))
      ) {
        score += 0.5
        matchReasons.push(`Direct standard reference '${std.standardNumber}' cited in procurement text`)
        matchedRequirements.push({
          reqName: 'Mandatory Standards Conformity',
          type: EvidenceType.SPECIFICATION_MATCH,
          notes: `Specification directly invokes ${std.standardNumber}.`,
        })
      }

      // 2. Product & Category Matching (up to 0.35)
      const productReqs = requirements.filter((r) => r.category === RequirementCategory.PRODUCT)
      for (const productReq of productReqs) {
        const prodTokens = productReq.value.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
        let tokenHits = 0
        for (const token of prodTokens) {
          if (titleLower.includes(token) || scopeLower.includes(token)) {
            tokenHits++
          }
        }
        if (tokenHits > 0) {
          const prodBonus = Math.min(0.35, 0.18 + tokenHits * 0.08)
          score += prodBonus
          matchReasons.push(`Governs product class matching '${productReq.value}'`)
          matchedRequirements.push({
            reqName: productReq.name,
            type: EvidenceType.SCOPE_MATCH,
            notes: `Standard scope directly covers ${productReq.value}.`,
          })
          break
        }
      }

      // 2b. Structural Concrete Core Anchor: IS 456
      if (stdNumLower.includes('456') && (lowerText.includes('concrete') || lowerText.includes('rcc') || lowerText.includes('reinforced concrete'))) {
        score += 0.35
        matchReasons.push('Primary governing Indian standard and Code of Practice for Plain and Reinforced Concrete (RCC)')
        matchedRequirements.push({
          reqName: 'Design & Construction Code',
          type: EvidenceType.SCOPE_MATCH,
          notes: 'Governs structural design, durability, workmanship, and material compliance for plain and reinforced concrete.',
        })
      }

      // 3. Technical Requirements & Material Matching (up to 0.25)
      for (const req of requirements) {
        if (req.category === RequirementCategory.MATERIAL) {
          const matLower = req.value.toLowerCase()
          if (
            (matLower.includes('pe 100') && stdNumLower.includes('4984')) ||
            (matLower.includes('fe 500') && stdNumLower.includes('1786')) ||
            (matLower.includes('aluminium') && stdNumLower.includes('10322')) ||
            (matLower.includes('opc') && stdNumLower.includes('8112')) ||
            scopeLower.includes(matLower.slice(0, 10))
          ) {
            score += 0.18
            matchReasons.push(`Specifies compliance for material: ${req.value}`)
            matchedRequirements.push({
              reqName: req.name,
              type: EvidenceType.TECHNICAL_MATCH,
              notes: `Prescribes material specifications and chemical/mechanical properties for ${req.value}.`,
            })
          }
        }

        if (req.category === RequirementCategory.PERFORMANCE || req.category === RequirementCategory.ELECTRICAL) {
          if (
            (req.name.includes('Efficacy') || req.name.includes('Power Factor') || req.name.includes('Surge')) &&
            (stdNumLower.includes('10322') || stdNumLower.includes('16103') || stdNumLower.includes('15885'))
          ) {
            score += 0.12
            matchedRequirements.push({
              reqName: req.name,
              type: EvidenceType.TECHNICAL_MATCH,
              notes: `Performance benchmark verified under ${std.standardNumber}.`,
            })
          }
          if (
            req.name.includes('Concrete Grade') &&
            (stdNumLower.includes('456') || stdNumLower.includes('10262') || stdNumLower.includes('4926'))
          ) {
            score += 0.15
            matchReasons.push(`Defines characteristic compressive strength criteria for ${req.value}`)
            matchedRequirements.push({
              reqName: req.name,
              type: EvidenceType.TECHNICAL_MATCH,
              notes: `Structural mix design and strength compliance defined in ${std.standardNumber}.`,
            })
          }
        }

        if (req.category === RequirementCategory.SAFETY) {
          if (
            (req.value.includes('IP') || req.value.includes('Ingress')) &&
            (stdNumLower.includes('60529') || stdNumLower.includes('10322') || stdNumLower.includes('16102'))
          ) {
            score += 0.15
            matchReasons.push(`Mandates ingress protection and environmental enclosure testing`)
            matchedRequirements.push({
              reqName: req.name,
              type: EvidenceType.TECHNICAL_MATCH,
              notes: `Provides standard ingress protection (IP ratings) degrees and test procedures.`,
            })
          }
          if (req.value.includes('Impact') && (stdNumLower.includes('2925') || stdNumLower.includes('15298'))) {
            score += 0.15
            matchReasons.push(`Mandates impact attenuation and penetration safety thresholds`)
            matchedRequirements.push({
              reqName: req.name,
              type: EvidenceType.TECHNICAL_MATCH,
              notes: `Specifies mandatory kinetic energy absorption limits.`,
            })
          }
        }

        if (req.category === RequirementCategory.TESTING) {
          if (
            (req.name.includes('Hydrostatic') && stdNumLower.includes('4984')) ||
            (req.name.includes('Salt Spray') && stdNumLower.includes('10322')) ||
            (req.name.includes('Workability') && (stdNumLower.includes('456') || stdNumLower.includes('4926')))
          ) {
            score += 0.12
            matchReasons.push(`Mandates test procedure: ${req.name}`)
            matchedRequirements.push({
              reqName: req.name,
              type: EvidenceType.TECHNICAL_MATCH,
              notes: `Authoritative testing protocol specified in ${std.standardNumber}.`,
            })
          }
        }
      }

      // 4. Sector & Domain Keyword Overlap (Civil, Electrical, Safety, Water, Fire)
      if (categoryLower.includes('electrical') && (lowerText.includes('led') || lowerText.includes('lighting') || lowerText.includes('luminaire') || lowerText.includes('cable') || lowerText.includes('lamp'))) {
        score += 0.1
      } else if (categoryLower.includes('civil') && (lowerText.includes('concrete') || lowerText.includes('cement') || lowerText.includes('aggregate') || lowerText.includes('tmt') || lowerText.includes('rebar'))) {
        score += 0.1
      } else if (categoryLower.includes('ppe') && (lowerText.includes('helmet') || lowerText.includes('footwear') || lowerText.includes('safety') || lowerText.includes('protection') || lowerText.includes('mask'))) {
        score += 0.1
      } else if (categoryLower.includes('piping') && (lowerText.includes('pipe') || lowerText.includes('water') || lowerText.includes('hdpe') || lowerText.includes('valve') || lowerText.includes('potable'))) {
        score += 0.1
      } else if (categoryLower.includes('fire') && (lowerText.includes('fire') || lowerText.includes('extinguisher') || lowerText.includes('alarm') || lowerText.includes('smoke'))) {
        score += 0.1
      }

      // 5. Cap and Normalize Score between 0.0 and 0.99
      let normalizedScore = Math.min(0.99, score)

      // Only recommend if score meets threshold
      if (normalizedScore >= 0.28) {
        // High confidence standards (> 0.70) are marked mandatory for procurement
        const isMandatory = normalizedScore >= 0.65 || lowerText.includes(cleanStdNum)

        const reasonText = matchReasons.length > 0
          ? `${matchReasons.join('. ')}.`
          : `Selected due to close technical domain alignment with ${std.category} procurement specifications.`

        results.push({
          standard: std,
          score: Math.round(normalizedScore * 100) / 100,
          reason: reasonText,
          isMandatory,
          matchedRequirements,
        })
      }
    }

    // Sort descending by score
    results.sort((a, b) => b.score - a.score)

    // Return top matching standards (up to 8)
    return results.slice(0, 8)
  }

  /**
   * Evaluate Certification Requirements & Mandatory Compliance Orders (QCO)
   */
  private static async evaluateCertifications(
    analysisId: string,
    rawText: string,
    recommendedStandards: any[]
  ): Promise<RecommendationResult['certifications']> {
    const certSchemes = await prisma.certificationRequirement.findMany({
      where: { status: 'ACTIVE' },
    })

    // Delete prior analysis certifications
    await prisma.analysisCertification.deleteMany({
      where: { analysisId },
    })

    const results: RecommendationResult['certifications'] = []
    const lowerText = rawText.toLowerCase()
    const stdNumbers = recommendedStandards.map((s) => s.standardNumber.toLowerCase()).join(' ')

    for (const scheme of certSchemes) {
      let status: CertificationCheckStatus = CertificationCheckStatus.NOT_IDENTIFIED
      let notes = 'No mandatory statutory applicability identified for current specification scope.'

      if (scheme.name.includes('ISI Mark')) {
        // ISI Mark is mandatory for Steel (IS 1786, IS 2062), Cement (IS 8112), Helmets (IS 2925), Footwear (IS 15298), Pipes (IS 4984, IS 1239), Extinguishers (IS 15683), Cables (IS 694)
        if (
          stdNumbers.includes('1786') ||
          stdNumbers.includes('2062') ||
          stdNumbers.includes('8112') ||
          stdNumbers.includes('2925') ||
          stdNumbers.includes('15298') ||
          stdNumbers.includes('4984') ||
          stdNumbers.includes('1239') ||
          stdNumbers.includes('15683') ||
          stdNumbers.includes('694') ||
          lowerText.includes('isi') ||
          lowerText.includes('steel') ||
          lowerText.includes('cement') ||
          lowerText.includes('helmet')
        ) {
          status = CertificationCheckStatus.IDENTIFIED
          notes = 'Mandatory third-party certification under BIS Scheme-I (ISI Mark). Products must carry valid Standard Mark (CM/L license number).'
        } else {
          status = CertificationCheckStatus.REVIEW_REQUIRED
          notes = 'Verification required: review tender contract terms to determine if voluntary ISI Mark is demanded by procurement authority.'
        }
      } else if (scheme.name.includes('CRS') || scheme.name.includes('Compulsory Registration')) {
        // CRS is mandatory for LED products, IT equipment, drivers
        if (
          stdNumbers.includes('10322') ||
          stdNumbers.includes('16102') ||
          stdNumbers.includes('15885') ||
          stdNumbers.includes('13252') ||
          lowerText.includes('led') ||
          lowerText.includes('luminaire') ||
          lowerText.includes('electronic')
        ) {
          status = CertificationCheckStatus.IDENTIFIED
          notes = 'Mandatory self-declaration of conformity under BIS Scheme-II (CRS) pursuant to MeitY orders. Registration mark and R-number required on packaging.'
        }
      } else if (scheme.name.includes('Quality Control Order') || scheme.name.includes('QCO')) {
        // QCOs apply to steel, cement, electrical, safety footwear, safety helmets, water pipes
        if (
          stdNumbers.includes('1786') ||
          stdNumbers.includes('2062') ||
          stdNumbers.includes('8112') ||
          stdNumbers.includes('2925') ||
          stdNumbers.includes('15298') ||
          stdNumbers.includes('4984') ||
          stdNumbers.includes('1239') ||
          stdNumbers.includes('15683') ||
          stdNumbers.includes('10322') ||
          stdNumbers.includes('15885')
        ) {
          status = CertificationCheckStatus.IDENTIFIED
          notes = 'Enforced under statutory Quality Control Order (QCO) issued by Government of India. Procurement of non-certified stock is legally prohibited.'
        } else {
          status = CertificationCheckStatus.REVIEW_REQUIRED
          notes = 'Verification required: check recent Gazette notifications for newly enforced QCO deadlines in this sector.'
        }
      }

      results.push({
        id: scheme.id,
        schemeName: scheme.name,
        category: scheme.category || 'General',
        description: scheme.description,
        status,
        statusLabel: status === CertificationCheckStatus.IDENTIFIED ? 'Mandatory / Identified' : status === CertificationCheckStatus.REVIEW_REQUIRED ? 'Review Required' : 'Not Identified',
        notes,
      })
    }

    if (results.length > 0) {
      await prisma.analysisCertification.createMany({
        data: results.map((r) => ({
          analysisId,
          certificationRequirementId: r.id,
          status: r.status,
          reason: r.notes,
        })),
      })
    }

    return results
  }

  /**
   * Generate Warnings and Specification Gap Alerts
   */
  private static generateWarnings(
    rawText: string,
    scoredStandards: any[],
    certifications: RecommendationResult['certifications']
  ): string[] {
    const warnings: string[] = []
    const lower = rawText.toLowerCase()

    if (scoredStandards.length === 0) {
      warnings.push('No verified Indian Standards matched the provided specification. Please ensure the specification includes product names, material grades, or technical ratings.')
      return warnings
    }

    // Check for missing safety/testing requirements in electrical specs
    const hasLighting = scoredStandards.some((s) => s.standard.standardNumber.includes('10322') || s.standard.standardNumber.includes('16103'))
    if (hasLighting) {
      if (!lower.includes('ip') && !lower.includes('ingress')) {
        warnings.push('Specification Gap: Outdoor roadway luminaire tender lacks explicit Ingress Protection (IP) rating clause. IS 10322 (Part 5/Sec 3) mandates minimum IP65/IP66 enclosure protection.')
      }
      if (!lower.includes('surge') && !lower.includes('spd')) {
        warnings.push('Recommended Clause: Tender does not specify Surge Protection Device (SPD) rating. Recommended minimum 10 kV surge endurance to prevent premature LED driver failure.')
      }
      if (!lower.includes('thd')) {
        warnings.push('Power Quality Gap: Total Harmonic Distortion (THD) threshold is unstated. Maximum 10% THD is recommended under CEA/BIS electrical grid benchmarks.')
      }
    }

    // Check for concrete / steel gaps
    const hasConcrete = scoredStandards.some((s) => s.standard.standardNumber.includes('456') || s.standard.standardNumber.includes('4926'))
    if (hasConcrete) {
      if (!lower.includes('exposure') && !lower.includes('severe') && !lower.includes('moderate')) {
        warnings.push('Durability Warning: Environmental exposure condition (Mild, Moderate, Severe, Very Severe, Extreme per IS 456 Table 3) is not declared. Essential to fix minimum cement content and cover to reinforcement.')
      }
      if (!lower.includes('water-cement') && !lower.includes('w/c')) {
        warnings.push('Specification Gap: Maximum free water-cement ratio is not capped. Must be designated per IS 456 durability limits.')
      }
    }

    // Check for water pipe gaps
    const hasHdpe = scoredStandards.some((s) => s.standard.standardNumber.includes('4984'))
    if (hasHdpe) {
      if (!lower.includes('10500') && !lower.includes('potable') && !lower.includes('drinking')) {
        warnings.push('Public Health Alert: Potable water pipeline must mandate non-toxicity compliance with IS 10500 (Drinking Water Quality) to prevent heavy metal migration.')
      }
      if (!lower.includes('pe 100') && !lower.includes('pe 80')) {
        warnings.push('Material Specification Gap: Raw material compound grade (PE 100 or PE 80) is unstated in the pipe schedule.')
      }
    }

    // QCO Statutory Reminder
    const qcoIdentified = certifications.some((c) => c.schemeName.includes('QCO') && c.status === CertificationCheckStatus.IDENTIFIED)
    if (qcoIdentified) {
      warnings.push('Statutory Compliance Notice: Items identified under Government Quality Control Orders (QCO) legally require BIS certification prior to customs clearance, dispatch, or tender acceptance.')
    }

    return warnings
  }

  /**
   * Generate Comprehensive Executive Audit Report
   */
  private static async generateReport(
    analysisId: string,
    title: string,
    scoredStandards: any[],
    certifications: RecommendationResult['certifications'],
    warnings: string[]
  ) {
    const reportTitle = `Procurement Standards Compliance Report — ${title}`
    const topStandard = scoredStandards[0]?.standard
    const mandatoryCount = scoredStandards.filter((s) => s.isMandatory).length

    const summary = `Executive Assessment: Technical evaluation of specification identified ${scoredStandards.length} applicable Indian Standards (${mandatoryCount} mandatory conformity standards). Primary governing standard is ${topStandard ? `${topStandard.standardNumber} (${topStandard.title})` : 'None'}. Review identified ${warnings.length} specification clarity observations and statutory compliance requirements.`

    const findings = {
      generatedAt: new Date().toISOString(),
      standardsIdentified: scoredStandards.length,
      primaryStandard: topStandard ? topStandard.standardNumber : 'None',
      mandatoryStandards: scoredStandards.filter((s) => s.isMandatory).map((s) => s.standard.standardNumber),
      complianceStatus: certifications.some((c) => c.status === 'IDENTIFIED') ? 'STATUTORY_CONFORMITY_MANDATORY' : 'STANDARD_REVIEW_RECOMMENDED',
      specificationGapsCount: warnings.length,
      disclaimer: 'Recommendations are intended to assist procurement review and should be verified against the latest applicable official standards and regulatory requirements.',
    }

    // Save report in DB
    const reportContent = JSON.stringify({ summary, findings }, null, 2)
    const report = await prisma.report.create({
      data: {
        analysisId,
        title: reportTitle,
        content: reportContent,
      },
    })

    return {
      id: report.id,
      title: report.title,
      summary,
      findings,
    }
  }

  /**
   * Optional Gemini AI Semantic Enrichment Pass
   */
  private static async enrichRequirementsWithAI(text: string, apiKey: string): Promise<ExtractedRequirementData[] | null> {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
      const prompt = `You are a Bureau of Indian Standards (BIS) technical procurement analyst. Analyze the following procurement specification text and extract key technical requirements strictly in JSON format.
Only return a JSON array of objects with the following schema:
[
  {
    "category": "PRODUCT" | "APPLICATION" | "MATERIAL" | "DIMENSION" | "PERFORMANCE" | "ELECTRICAL" | "SAFETY" | "TESTING" | "CERTIFICATION",
    "name": "Short descriptive name",
    "value": "Exact technical value or specification",
    "unit": "optional unit string or null",
    "isMandatory": true | false,
    "confidence": 0.95
  }
]

Do not invent standards or numbers. Only extract requirements present in this specification text:
"""${text.slice(0, 4000)}"""`

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(2500),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      })

      if (!res.ok) {
        return null
      }

      const json = await res.json()
      const rawOutput = json?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!rawOutput) return null

      const parsed = JSON.parse(rawOutput)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          category: (item.category as RequirementCategory) || RequirementCategory.PRODUCT,
          name: String(item.name || 'Requirement'),
          value: String(item.value || ''),
          unit: item.unit ? String(item.unit) : undefined,
          isMandatory: Boolean(item.isMandatory),
          confidence: typeof item.confidence === 'number' ? item.confidence : 0.9,
        }))
      }
      return null
    } catch {
      return null
    }
  }
}
