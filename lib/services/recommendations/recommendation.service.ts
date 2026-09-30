import { prisma } from '@/lib/prisma'
import {
  RequirementCategory,
  RelationshipType,
  EvidenceType,
  CertificationCheckStatus,
  AnalysisStatus,
  StandardStatus,
} from '@prisma/client'
import { GeminiService } from '@/lib/services/ai/gemini.service'
import { VERIFIED_STANDARDS_CATALOG, VERIFIED_CERTIFICATION_SCHEMES, VerifiedStandardRecord } from '@/lib/data/verified-standards'
import { devAnalysisStore } from '@/lib/services/analysis/analysis.service'

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
  completeness?: {
    scorePercent: number
    identifiedClauses: Array<{ name: string; value: string; category: string }>
    potentialGaps: Array<{
      title: string
      description: string
      severity: 'WARNING' | 'RECOMMENDATION' | 'NOTICE'
      suggestedClause: string
    }>
    suggestions: string[]
  }
  language?: string
  report?: {
    id: string
    title: string
    summary: string
    findings: any
  }
}

let cachedStandards: VerifiedStandardRecord[] | null = null
let cacheExpiry = 0

async function getStandardsCatalog(): Promise<VerifiedStandardRecord[]> {
  if (cachedStandards && Date.now() < cacheExpiry) {
    return cachedStandards
  }
  try {
    const standards = await Promise.race([
      prisma.standard.findMany({
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
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Prisma catalog query timeout')), 2500)
      ),
    ])

    if (standards && standards.length > 0) {
      cachedStandards = standards as unknown as VerifiedStandardRecord[]
      cacheExpiry = Date.now() + 1000 * 60 * 15 // 15 mins cache
      return cachedStandards
    }
  } catch (err) {
    console.warn('[getStandardsCatalog] Using authoritative in-memory catalog fallback:', (err as Error).message)
  }

  return [...VERIFIED_STANDARDS_CATALOG]
}

/**
 * Recommendation Service for IS-Guide AI
 * Primary AI Layer: Gemini 3.6 Flash with strict database grounding and deterministic fallback.
 */
export class RecommendationService {
  /**
   * Complete End-to-End Processing of a Procurement Specification
   *
   * Architecture:
   * User Input -> Gemini semantic interpretation -> Structured requirements ->
   * Verified database retrieval -> Candidate standards -> Gemini semantic relevance/explanation ->
   * Final grounded recommendations
   */
  static async processAnalysis(analysisId: string): Promise<RecommendationResult> {
    // 1. Fetch analysis record
    let analysis: any = null
    try {
      analysis = await prisma.procurementAnalysis.findUnique({
        where: { id: analysisId },
      })
    } catch {
      analysis = devAnalysisStore.get(analysisId)
    }

    if (!analysis) {
      analysis = devAnalysisStore.get(analysisId)
    }

    if (!analysis) {
      throw new Error(`Analysis with ID ${analysisId} not found`)
    }

    // Set status to PROCESSING
    try {
      await prisma.procurementAnalysis.update({
        where: { id: analysisId },
        data: { status: AnalysisStatus.PROCESSING },
      })
    } catch {
      if (devAnalysisStore.has(analysisId)) {
        devAnalysisStore.get(analysisId).status = AnalysisStatus.PROCESSING
      }
    }

    try {
      const { normalizedText, detectedLanguage } = this.normalizeMultilingualInput(
        analysis.rawInput || '',
        analysis.language || 'en'
      )
      const rawText = normalizedText

      // ----------------------------------------------------------------------
      // STEP 1 & 2: Gemini Semantic Interpretation -> Structured Requirements
      // ----------------------------------------------------------------------
      const extractedData = await this.extractRequirements(rawText, detectedLanguage)

      // Clear any prior extracted requirements for this analysis (idempotent)
      try {
        await prisma.extractedRequirement.deleteMany({
          where: { analysisId },
        })
      } catch {
        // Ignored in offline fallback
      }

      // Persist Extracted Requirements
      let createdRequirements: any[] = []
      try {
        createdRequirements = await Promise.all(
          extractedData.map((req) =>
            prisma.extractedRequirement.create({
              data: {
                analysisId,
                category: req.category,
                name: req.name,
                value: req.value,
                unit: req.unit || null,
                description: req.isMandatory
                  ? 'Mandatory specification clause'
                  : 'Recommended specification clause',
                confidence: req.confidence,
              },
            })
          )
        )
      } catch {
        createdRequirements = extractedData.map((req, idx) => ({
          id: `req_${analysisId}_${idx}`,
          analysisId,
          category: req.category,
          name: req.name,
          value: req.value,
          unit: req.unit || null,
          description: req.isMandatory ? 'Mandatory clause' : 'Recommended clause',
          confidence: req.confidence,
        }))
      }

      // ----------------------------------------------------------------------
      // STEP 3: Verified Database Retrieval -> Candidate Standards
      // ----------------------------------------------------------------------
      const allVerifiedStandards = await getStandardsCatalog()
      const candidateStandards = this.retrieveCandidateStandards(
        rawText,
        extractedData,
        allVerifiedStandards
      )

      // ----------------------------------------------------------------------
      // STEP 4: Gemini Semantic Relevance, Explanation & Gaps Analysis
      // ----------------------------------------------------------------------
      const { scoredStandards, geminiGaps, geminiExecutiveSummary } =
        await this.scoreAndExplainCandidates(
          rawText,
          extractedData,
          candidateStandards,
          allVerifiedStandards,
          detectedLanguage
        )

      // ----------------------------------------------------------------------
      // STEP 5: Final Grounded Recommendations (Retain all required fields)
      // ----------------------------------------------------------------------
      try {
        await prisma.recommendation.deleteMany({
          where: { analysisId },
        })
      } catch {
        // Fallback
      }

      const savedRecommendations: RecommendationResult['recommendations'] = []
      const evidenceToBatch: any[] = []

      for (let i = 0; i < scoredStandards.length; i++) {
        const item = scoredStandards[i]
        const rank = i + 1

        let recId = `rec_${analysisId}_${rank}`
        try {
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
          recId = rec.id
        } catch {
          // Fallback
        }

        // Collect evidence
        const evidenceRecords: RecommendationResult['recommendations'][0]['evidence'] = []
        for (const ev of item.matchedRequirements) {
          const reqRecord = createdRequirements.find((r) => r.name === ev.reqName)
          const evType = ev.type || EvidenceType.SPECIFICATION_MATCH
          const evText = ev.notes || 'Technical specification alignment identified for this standard.'
          if (reqRecord) {
            evidenceToBatch.push({
              recommendationId: recId,
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
          } else {
            evidenceRecords.push({
              requirementName: ev.reqName,
              requirementValue: 'Technical Specification Requirement',
              evidenceType: evType,
              notes: evText,
            })
          }
        }

        // Partition related standards
        const normativeReferences: Array<{ standardNumber: string; title: string; description: string; sourceReference: string }> = []
        const testMethods: Array<{ standardNumber: string; title: string; description: string; sourceReference: string }> = []
        const safetyStandards: Array<{ standardNumber: string; title: string; description: string; sourceReference: string }> = []
        const installationStandards: Array<{ standardNumber: string; title: string; description: string; sourceReference: string }> = []
        const relatedStandards: Array<{ standardNumber: string; title: string; description: string; sourceReference: string }> = []

        for (const rel of item.standard.outgoingRelationships || []) {
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

        const currentVersion =
          item.standard.versions?.find((v: any) => v.status === 'CURRENT') ||
          item.standard.currentVersion ||
          item.standard.versions?.[0] ||
          null

        savedRecommendations.push({
          id: recId,
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
            shortTitle: item.standard.shortTitle || null,
            category: item.standard.category,
            status: item.standard.status,
            scope: item.standard.scope,
            sourceUrl: item.standard.sourceUrl || null,
            currentVersion: currentVersion
              ? {
                  versionLabel: currentVersion.versionLabel,
                  publicationDate: currentVersion.publicationDate,
                  status: currentVersion.status,
                }
              : null,
            versions: (item.standard.versions || []).map((v: any) => ({
              versionLabel: v.versionLabel,
              publicationDate: v.publicationDate,
              status: v.status,
            })),
            amendments: (item.standard.amendments || []).map((a: any) => ({
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

      // Batch insert evidence rows if DB is connected
      if (evidenceToBatch.length > 0) {
        try {
          await prisma.recommendationEvidence.createMany({
            data: evidenceToBatch,
          })
        } catch {
          // Ignored in offline fallback
        }
      }

      // ----------------------------------------------------------------------
      // STEP 6: Certifications, Completeness Gaps & Executive Report
      // ----------------------------------------------------------------------
      const certResults = await this.evaluateCertifications(
        analysisId,
        rawText,
        scoredStandards.map((s) => s.standard)
      )

      const warnings = this.generateWarnings(rawText, scoredStandards, certResults)

      const completeness = this.computeSpecificationCompleteness(
        rawText,
        extractedData,
        scoredStandards,
        geminiGaps
      )

      const report = await this.generateReport(
        analysisId,
        analysis.title || 'Procurement Specification',
        scoredStandards,
        certResults,
        warnings,
        completeness,
        geminiExecutiveSummary
      )

      // Mark analysis as COMPLETED
      try {
        await prisma.procurementAnalysis.update({
          where: { id: analysisId },
          data: { status: AnalysisStatus.COMPLETED },
        })
      } catch {
        if (devAnalysisStore.has(analysisId)) {
          devAnalysisStore.get(analysisId).status = AnalysisStatus.COMPLETED
        }
      }

      const result: RecommendationResult = {
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
        completeness,
        language: detectedLanguage,
        report,
      }

      if (devAnalysisStore.has(analysisId)) {
        const stored = devAnalysisStore.get(analysisId)
        devAnalysisStore.set(analysisId, {
          ...stored,
          status: AnalysisStatus.COMPLETED,
          requirements: result.requirements,
          recommendations: result.recommendations,
          certifications: result.certifications,
          warnings: result.warnings,
          report: result.report,
        })
      }

      return result
    } catch (err) {
      console.error('[RecommendationService.processAnalysis] Error:', err)
      try {
        await prisma.procurementAnalysis.update({
          where: { id: analysisId },
          data: { status: AnalysisStatus.FAILED },
        })
      } catch {
        if (devAnalysisStore.has(analysisId)) {
          devAnalysisStore.get(analysisId).status = AnalysisStatus.FAILED
        }
      }
      throw err
    }
  }

  /**
   * Primary Requirements Extraction:
   * Uses Gemini 3.6 Flash semantic interpretation with automatic deterministic fallback.
   */
  static async extractRequirements(
    text: string,
    languageHint?: string
  ): Promise<ExtractedRequirementData[]> {
    const requirements: ExtractedRequirementData[] = []

    // 1. Try Gemini 3.6 Flash Semantic Interpretation
    try {
      const geminiResult = await GeminiService.interpretAndExtractRequirements(text, languageHint)
      if (geminiResult && geminiResult.requirements && geminiResult.requirements.length > 0) {
        for (const item of geminiResult.requirements) {
          requirements.push({
            category: item.category as RequirementCategory,
            name: item.name,
            value: item.value,
            unit: item.unit || undefined,
            isMandatory: item.isMandatory,
            confidence: item.confidence,
          })
        }
      }
    } catch (err) {
      console.warn('[RecommendationService.extractRequirements] Gemini semantic pass failed, falling back:', (err as Error).message)
    }

    // 2. Augment / Fallback with deterministic regex & domain ontology
    const deterministic = this.extractRequirementsDeterministic(text)
    for (const d of deterministic) {
      const exists = requirements.some(
        (r) =>
          r.name.toLowerCase() === d.name.toLowerCase() ||
          r.value.toLowerCase() === d.value.toLowerCase()
      )
      if (!exists) {
        requirements.push(d)
      }
    }

    return requirements
  }

  /**
   * Retrieve Candidate Standards from Verified Database
   * Authoritative ground truth: Candidates must strictly come from the verified standards database.
   */
  private static retrieveCandidateStandards(
    rawText: string,
    requirements: ExtractedRequirementData[],
    standardsCatalog: VerifiedStandardRecord[]
  ): VerifiedStandardRecord[] {
    const lowerText = rawText.toLowerCase()
    const candidates = new Set<VerifiedStandardRecord>()

    // Extract potential standard numbers from text or requirements
    const isMatches = rawText.match(/IS\s*(\d+)/gi) || []
    const explicitNumbers = new Set(
      isMatches.map((m) => m.toLowerCase().replace(/[^0-9]/g, ''))
    )

    // Tokenized query terms
    const productReqs = requirements.filter(
      (r) => r.category === RequirementCategory.PRODUCT || r.category === RequirementCategory.MATERIAL
    )
    const keywords = productReqs
      .flatMap((r) => r.value.toLowerCase().split(/\s+/))
      .filter((w) => w.length > 3)

    for (const std of standardsCatalog) {
      const stdNumClean = std.standardNumber.toLowerCase().replace(/[^0-9]/g, '')
      const titleLower = std.title.toLowerCase()
      const scopeLower = std.scope.toLowerCase()
      const catLower = std.category.toLowerCase()

      // 1. Direct explicit citation match
      if (explicitNumbers.has(stdNumClean) || lowerText.includes(std.standardNumber.toLowerCase())) {
        candidates.add(std)
        continue
      }

      // 2. Keyword & Domain match
      let score = 0
      for (const kw of keywords) {
        if (titleLower.includes(kw)) score += 3
        else if (scopeLower.includes(kw)) score += 1
      }

      // Domain-specific anchors
      if (
        (lowerText.includes('street light') || lowerText.includes('led') || lowerText.includes('luminaire')) &&
        (std.standardNumber.includes('10322') || std.standardNumber.includes('16103') || std.standardNumber.includes('15885') || std.standardNumber.includes('60529') || std.standardNumber.includes('694'))
      ) {
        candidates.add(std)
      } else if (
        (lowerText.includes('concrete') || lowerText.includes('rmc') || lowerText.includes('steel') || lowerText.includes('tmt')) &&
        (std.standardNumber.includes('456') || std.standardNumber.includes('1786') || std.standardNumber.includes('383') || std.standardNumber.includes('10262') || std.standardNumber.includes('4926') || std.standardNumber.includes('8112') || std.standardNumber.includes('2062'))
      ) {
        candidates.add(std)
      } else if (
        (lowerText.includes('helmet') || lowerText.includes('footwear') || lowerText.includes('ppe')) &&
        (std.standardNumber.includes('2925') || std.standardNumber.includes('15298') || std.standardNumber.includes('9473') || std.standardNumber.includes('3521'))
      ) {
        candidates.add(std)
      } else if (
        (lowerText.includes('hdpe') || lowerText.includes('pipe') || lowerText.includes('water supply') || lowerText.includes('potable')) &&
        (std.standardNumber.includes('4984') || std.standardNumber.includes('10500') || std.standardNumber.includes('1239') || std.standardNumber.includes('779') || std.standardNumber.includes('14846'))
      ) {
        candidates.add(std)
      } else if (
        (lowerText.includes('fire') || lowerText.includes('extinguisher') || lowerText.includes('alarm')) &&
        (std.standardNumber.includes('15683') || std.standardNumber.includes('2189'))
      ) {
        candidates.add(std)
      } else if (score >= 2) {
        candidates.add(std)
      }
    }

    return Array.from(candidates)
  }

  /**
   * Semantic Relevance Scoring & Explanations:
   * Uses Gemini 3.6 Flash against verified candidate standards with automatic deterministic fallback.
   */
  private static async scoreAndExplainCandidates(
    rawText: string,
    requirements: ExtractedRequirementData[],
    candidateStandards: VerifiedStandardRecord[],
    allVerifiedStandards: VerifiedStandardRecord[],
    language: string = 'en'
  ): Promise<{
    scoredStandards: Array<{
      standard: VerifiedStandardRecord
      score: number
      reason: string
      isMandatory: boolean
      matchedRequirements: Array<{ reqName: string; type: EvidenceType; notes: string }>
    }>
    geminiGaps?: Array<{ title: string; description: string; severity: 'WARNING' | 'RECOMMENDATION' | 'NOTICE'; suggestedClause: string }>
    geminiExecutiveSummary?: string
  }> {
    // If no candidate standards found (e.g. no-match query), return empty list immediately
    if (candidateStandards.length === 0) {
      return { scoredStandards: [] }
    }

    // 1. Try Gemini 3.6 Flash Semantic Relevance & Grounded Explanation
    try {
      const geminiResult = await GeminiService.rankAndExplainCandidates(
        rawText,
        requirements,
        candidateStandards,
        language
      )

      if (geminiResult && geminiResult.evaluations && geminiResult.evaluations.length > 0) {
        const scoredStandards: Array<{
          standard: VerifiedStandardRecord
          score: number
          reason: string
          isMandatory: boolean
          matchedRequirements: Array<{ reqName: string; type: EvidenceType; notes: string }>
        }> = []

        for (const ev of geminiResult.evaluations) {
          // Strictly ground to candidates
          const standardRecord = candidateStandards.find(
            (c) => c.standardNumber.toLowerCase().trim() === ev.standardNumber.toLowerCase().trim()
          )

          if (standardRecord) {
            scoredStandards.push({
              standard: standardRecord,
              score: Math.min(0.99, Math.max(0.1, Math.round(ev.systemRelevanceScore * 100) / 100)),
              reason: ev.reason,
              isMandatory: ev.isMandatory,
              matchedRequirements: (ev.matchedRequirements || []).map((m) => ({
                reqName: m.reqName,
                type: (m.evidenceType as EvidenceType) || EvidenceType.SPECIFICATION_MATCH,
                notes: m.notes,
              })),
            })
          }
        }

        if (scoredStandards.length > 0) {
          // Sort descending by score
          scoredStandards.sort((a, b) => b.score - a.score)
          return {
            scoredStandards: scoredStandards.slice(0, 8),
            geminiGaps: geminiResult.potentialGaps,
            geminiExecutiveSummary: geminiResult.executiveSummary,
          }
        }
      }
    } catch (err) {
      console.warn('[RecommendationService.scoreAndExplainCandidates] Gemini pass note, falling back to deterministic:', (err as Error).message)
    }

    // 2. Deterministic Fallback Engine (Guaranteed zero hallucination)
    const deterministic = this.scoreStandardsDeterministic(rawText, requirements, candidateStandards)
    return { scoredStandards: deterministic }
  }

  /**
   * Deterministic Standard Matching & Relevance Scoring Engine (Fallback)
   */
  private static scoreStandardsDeterministic(
    rawText: string,
    requirements: ExtractedRequirementData[],
    standards: VerifiedStandardRecord[]
  ): Array<{
    standard: VerifiedStandardRecord
    score: number
    reason: string
    isMandatory: boolean
    matchedRequirements: Array<{ reqName: string; type: EvidenceType; notes: string }>
  }> {
    const lowerText = rawText.toLowerCase()
    const results: Array<{
      standard: VerifiedStandardRecord
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
      if (
        stdNumLower.includes('456') &&
        (lowerText.includes('concrete') || lowerText.includes('rcc') || lowerText.includes('reinforced concrete'))
      ) {
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
              notes: `Prescribes mix proportions and compressive strength verification for ${req.value}.`,
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
        }
      }

      // 4. Sector & Domain Keyword Overlap
      if (categoryLower.includes('electrical') && (lowerText.includes('led') || lowerText.includes('lighting') || lowerText.includes('luminaire') || lowerText.includes('cable'))) {
        score += 0.1
      } else if (categoryLower.includes('civil') && (lowerText.includes('concrete') || lowerText.includes('cement') || lowerText.includes('aggregate') || lowerText.includes('tmt'))) {
        score += 0.1
      } else if (categoryLower.includes('safety') && (lowerText.includes('helmet') || lowerText.includes('footwear') || lowerText.includes('protection'))) {
        score += 0.1
      } else if (categoryLower.includes('piping') && (lowerText.includes('pipe') || lowerText.includes('water') || lowerText.includes('hdpe') || lowerText.includes('valve'))) {
        score += 0.1
      } else if (categoryLower.includes('fire') && (lowerText.includes('fire') || lowerText.includes('extinguisher') || lowerText.includes('alarm'))) {
        score += 0.1
      }

      const normalizedScore = Math.min(0.99, score)

      if (normalizedScore >= 0.25) {
        const isMandatory = normalizedScore >= 0.65 || lowerText.includes(cleanStdNum)
        const reasonText =
          matchReasons.length > 0
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

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, 8)
  }

  /**
   * Deterministic Technical Requirements Extraction (Regex & Domain Rules)
   */
  private static extractRequirementsDeterministic(text: string): ExtractedRequirementData[] {
    const requirements: ExtractedRequirementData[] = []
    const lower = text.toLowerCase()

    // 1. Product Identification
    if (lower.includes('street light') || lower.includes('luminaire') || lower.includes('led fixture') || lower.includes('roadway light')) {
      requirements.push({
        category: RequirementCategory.PRODUCT,
        name: 'Product Type',
        value: 'Outdoor LED Street Lighting Luminaire',
        isMandatory: true,
        confidence: 0.98,
      })
    }
    if (lower.includes('ready-mixed concrete') || lower.includes('ready mixed concrete') || lower.includes('rmc') || lower.includes('reinforced concrete') || (lower.includes('concrete') && (lower.includes('grade m') || lower.includes('mix design')))) {
      requirements.push({
        category: RequirementCategory.PRODUCT,
        name: 'Product Type',
        value: 'Plain and Reinforced Concrete / Ready-Mixed Concrete',
        isMandatory: true,
        confidence: 0.96,
      })
    }
    if (lower.includes('tmt') || lower.includes('rebar') || lower.includes('reinforcement steel') || lower.includes('deformed steel') || lower.includes('steel bar')) {
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

    // 2. Electrical Specifications
    const wattMatch = text.match(/(\d+)\s*(?:W|Watt|watts)\b/i)
    if (wattMatch) {
      requirements.push({
        category: RequirementCategory.ELECTRICAL,
        name: 'Rated System Wattage',
        value: `${wattMatch[1]} W`,
        unit: 'W',
        isMandatory: true,
        confidence: 0.95,
      })
    }

    const surgeMatch = text.match(/(\d+)\s*(?:kV|kilovolt)\b/i)
    if (surgeMatch) {
      requirements.push({
        category: RequirementCategory.ELECTRICAL,
        name: 'Surge Protection Device (SPD) Rating',
        value: `${surgeMatch[1]} kV`,
        unit: 'kV',
        isMandatory: true,
        confidence: 0.94,
      })
    }

    // 3. Environmental & Safety Ratings
    const ipMatch = text.match(/\b(IP\s*\d{2})\b/i)
    if (ipMatch) {
      const cleanIp = ipMatch[1].replace(/\s+/g, '').toUpperCase()
      requirements.push({
        category: RequirementCategory.SAFETY,
        name: 'Ingress Protection (IP Code)',
        value: cleanIp,
        isMandatory: true,
        confidence: 0.98,
      })
    }

    // 4. Pipe Dimensions & Pressure Ratings
    const diaMatch = text.match(/(\d+)\s*(?:mm|millimeter)\s*(?:dia|diameter|od|outer diameter)?/i)
    if (diaMatch && (lower.includes('pipe') || lower.includes('hdpe') || lower.includes('pvc'))) {
      requirements.push({
        category: RequirementCategory.DIMENSION,
        name: 'Outer Diameter (OD)',
        value: `${diaMatch[1]} mm`,
        unit: 'mm',
        isMandatory: true,
        confidence: 0.95,
      })
    }

    const pnMatch = text.match(/\b(PN\s*\d+(?:\.\d+)?)\b/i)
    if (pnMatch) {
      requirements.push({
        category: RequirementCategory.PERFORMANCE,
        name: 'Nominal Pressure Rating',
        value: pnMatch[1].toUpperCase(),
        isMandatory: true,
        confidence: 0.96,
      })
    }

    // 5. Material Specifications
    if (lower.includes('pe 100') || lower.includes('pe-100') || lower.includes('pe100')) {
      requirements.push({
        category: RequirementCategory.MATERIAL,
        name: 'Polymer Compound Grade',
        value: 'PE 100 Virgin Compound',
        isMandatory: true,
        confidence: 0.95,
      })
    }
    if (lower.includes('fe 500d') || lower.includes('fe500d')) {
      requirements.push({
        category: RequirementCategory.MATERIAL,
        name: 'Steel Reinforcement Grade',
        value: 'Fe 500D (High Ductility)',
        isMandatory: true,
        confidence: 0.98,
      })
    }

    // 6. BIS / Certification Requirements
    if (lower.includes('bis') || lower.includes('isi') || lower.includes('qco') || lower.includes('crs')) {
      requirements.push({
        category: RequirementCategory.CERTIFICATION,
        name: 'Mandatory Standards Conformity',
        value: 'BIS Certification (ISI Mark or CRS as applicable under Govt QCO)',
        isMandatory: true,
        confidence: 0.99,
      })
    } else {
      requirements.push({
        category: RequirementCategory.CERTIFICATION,
        name: 'Statutory Conformity',
        value: 'Verification against applicable Bureau of Indian Standards (BIS) Quality Control Orders',
        isMandatory: true,
        confidence: 0.85,
      })
    }

    return requirements
  }

  /**
   * Evaluate Certification Requirements & Mandatory Compliance Orders (QCO)
   */
  private static async evaluateCertifications(
    analysisId: string,
    rawText: string,
    recommendedStandards: any[]
  ): Promise<RecommendationResult['certifications']> {
    let certSchemes: any[] = []
    try {
      certSchemes = await prisma.certificationRequirement.findMany({
        where: { status: 'ACTIVE' },
      })
    } catch {
      // Offline fallback
    }

    if (!certSchemes || certSchemes.length === 0) {
      certSchemes = VERIFIED_CERTIFICATION_SCHEMES.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        description: c.description,
      }))
    }

    const results: RecommendationResult['certifications'] = []
    const lowerText = rawText.toLowerCase()
    const stdNumbers = recommendedStandards.map((s) => s.standardNumber.toLowerCase()).join(' ')

    for (const scheme of certSchemes) {
      let status: CertificationCheckStatus = CertificationCheckStatus.NOT_IDENTIFIED
      let notes = 'No mandatory statutory applicability identified for current specification scope.'

      if (scheme.name.includes('ISI Mark')) {
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
        if (
          stdNumbers.includes('10322') ||
          stdNumbers.includes('16102') ||
          stdNumbers.includes('15885') ||
          stdNumbers.includes('13252') ||
          lowerText.includes('led') ||
          lowerText.includes('luminaire')
        ) {
          status = CertificationCheckStatus.IDENTIFIED
          notes = 'Mandatory self-declaration of conformity under BIS Scheme-II (CRS) pursuant to MeitY orders. Registration mark and R-number required on packaging.'
        }
      } else if (scheme.name.includes('Quality Control Order') || scheme.name.includes('QCO')) {
        if (
          stdNumbers.includes('1786') ||
          stdNumbers.includes('2062') ||
          stdNumbers.includes('8112') ||
          stdNumbers.includes('2925') ||
          stdNumbers.includes('15298') ||
          stdNumbers.includes('4984') ||
          stdNumbers.includes('1239') ||
          stdNumbers.includes('15683') ||
          stdNumbers.includes('10322')
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
        statusLabel:
          status === CertificationCheckStatus.IDENTIFIED
            ? 'Mandatory / Identified'
            : status === CertificationCheckStatus.REVIEW_REQUIRED
            ? 'Review Required'
            : 'Not Identified',
        notes,
      })
    }

    try {
      await prisma.analysisCertification.deleteMany({
        where: { analysisId },
      })
      if (results.length > 0) {
        await prisma.analysisCertification.createMany({
          data: results.map((r) => ({
            analysisId,
            certificationRequirementId: r.id,
            status: r.status,
            notes: r.notes,
          })),
        })
      }
    } catch {
      // Ignored in offline fallback
    }

    return results
  }

  /**
   * Warnings Generation
   */
  private static generateWarnings(
    rawText: string,
    scoredStandards: any[],
    certifications: RecommendationResult['certifications']
  ): string[] {
    const warnings: string[] = []
    const lower = rawText.toLowerCase()

    if (scoredStandards.length === 0) {
      warnings.push(
        'Zero Standards Grounded: The specification text does not match any authenticated Indian Standard in the verified catalog.'
      )
      return warnings
    }

    // Street lighting warnings
    const hasLighting = scoredStandards.some((s) => s.standard.standardNumber.includes('10322'))
    if (hasLighting) {
      if (!lower.includes('ip6') && !lower.includes('ip 6')) {
        warnings.push('Environmental Protection Gap: Street lighting specifications must mandate minimum IP65/IP66 enclosure protection.')
      }
      if (!lower.includes('surge') && !lower.includes('10kv')) {
        warnings.push('Power Quality Alert: Outdoor LED fixtures require minimum 10 kV internal/external surge protection.')
      }
    }

    // Concrete & Construction warnings
    const hasConcrete = scoredStandards.some((s) => s.standard.standardNumber.includes('456'))
    if (hasConcrete) {
      if (!lower.includes('exposure') && !lower.includes('severe') && !lower.includes('moderate')) {
        warnings.push('Durability Classification Gap: IS 456 Table 3 environmental exposure condition is unstated.')
      }
    }

    // Water pipe warnings
    const hasHdpe = scoredStandards.some((s) => s.standard.standardNumber.includes('4984'))
    if (hasHdpe) {
      if (!lower.includes('10500') && !lower.includes('potable') && !lower.includes('drinking')) {
        warnings.push('Public Health Alert: Potable water pipeline must mandate non-toxicity compliance with IS 10500.')
      }
    }

    // QCO Statutory Reminder
    const qcoIdentified = certifications.some(
      (c) => c.schemeName.includes('QCO') && c.status === CertificationCheckStatus.IDENTIFIED
    )
    if (qcoIdentified) {
      warnings.push('Statutory Compliance Notice: Items identified under Government Quality Control Orders (QCO) legally require BIS certification prior to tender acceptance.')
    }

    return warnings
  }

  /**
   * Multilingual text normalization for Indian languages (Hindi, Telugu)
   * Maps natural language procurement terms to domain concepts while keeping standard numbers unchanged.
   */
  private static normalizeMultilingualInput(
    text: string,
    declaredLanguage?: string
  ): { normalizedText: string; detectedLanguage: string } {
    let lang = declaredLanguage || 'en'
    let norm = text

    // Detect Devanagari script (Hindi)
    if (/[\u0900-\u097F]/.test(text)) {
      lang = 'hi'
    } else if (/[\u0C00-\u0C7F]/.test(text)) {
      // Detect Telugu script
      lang = 'te'
    }

    if (lang === 'hi') {
      norm = norm
        .replace(/पीने का पानी|पेयजल|पीने के पानी/gi, 'potable drinking water')
        .replace(/एचडीपीई|एच डी पी ई/gi, 'HDPE pipe')
        .replace(/पाइप|नल/gi, 'pipe')
        .replace(/व्यास/gi, 'dia outer diameter')
        .replace(/स्ट्रीट लाइट|सड़क की बत्ती|सड़क बत्ती/gi, 'outdoor LED street light luminaire')
        .replace(/प्रकाश|रोशनी/gi, 'lighting luminaire')
        .replace(/कंक्रीट|सीमेंट कंक्रीट/gi, 'concrete ready-mixed concrete')
        .replace(/आरसीसी|आर सी सी/gi, 'RCC reinforced concrete')
        .replace(/सरिया|टीएमटी|टी एम टी/gi, 'TMT high strength deformed steel rebar')
        .replace(/हेलमेट|सुरक्षा टोपी/gi, 'industrial safety helmet')
        .replace(/जूते|सुरक्षा जूते/gi, 'safety footwear shoes')
        .replace(/अग्निशामक|आग बुझाने/gi, 'portable fire extinguisher')
        .replace(/पानी का मीटर/gi, 'domestic water meter')
        .replace(/तार|केबल/gi, 'PVC insulated electrical cable')
        .replace(/मानक|बीआइएस|बीआईएस/gi, 'BIS Indian Standard')
    } else if (lang === 'te') {
      norm = norm
        .replace(/తాగునీరు|మంచినీరు|తాగునీటి/gi, 'potable drinking water')
        .replace(/హెచ్‌డిపిఇ|హెచ్ డి పి ఇ/gi, 'HDPE pipe')
        .replace(/పైపులు|పైపు/gi, 'pipe')
        .replace(/వ్యాసం/gi, 'dia outer diameter')
        .replace(/వీధి దీపాలు|స్ట్రీట్ లైట్/gi, 'outdoor LED street light luminaire')
        .replace(/కాంక్రీట్/gi, 'concrete ready-mixed concrete')
        .replace(/ఆర్ సి సి|ఆర్సీసీ/gi, 'RCC reinforced concrete')
        .replace(/స్టీల్|ఇనుము|టిఎంటి/gi, 'TMT high strength deformed steel rebar')
        .replace(/రక్షణ హెల్మెట్|హెల్మెట్/gi, 'industrial safety helmet')
        .replace(/సేఫ్టీ బూట్లు|బూట్లు/gi, 'safety footwear shoes')
        .replace(/అగ్నిమాపక/gi, 'portable fire extinguisher')
        .replace(/నీటి మీటర్/gi, 'domestic water meter')
        .replace(/కేబుల్|వైరు/gi, 'PVC insulated electrical cable')
        .replace(/ప్రమాణాలు|బిఐఎస్/gi, 'BIS Indian Standard')
    }

    return {
      normalizedText: `${text}\n${norm}`,
      detectedLanguage: lang,
    }
  }

  /**
   * Evaluate Specification Completeness and Technical Gap Analysis
   */
  static computeSpecificationCompleteness(
    rawText: string,
    requirements: ExtractedRequirementData[],
    scoredStandards: any[],
    geminiGaps?: Array<{ title: string; description: string; severity: 'WARNING' | 'RECOMMENDATION' | 'NOTICE'; suggestedClause: string }>
  ): NonNullable<RecommendationResult['completeness']> {
    const lower = rawText.toLowerCase()
    const identifiedClauses: Array<{ name: string; value: string; category: string }> = []
    const potentialGaps: Array<{
      title: string
      description: string
      severity: 'WARNING' | 'RECOMMENDATION' | 'NOTICE'
      suggestedClause: string
    }> = []
    const suggestions: string[] = []

    let score = 25 // baseline submission credit

    // 1. Product Identified
    const prodReqs = requirements.filter((r) => r.category === RequirementCategory.PRODUCT)
    if (prodReqs.length > 0) {
      score += 20
      prodReqs.forEach((p) => identifiedClauses.push({ name: 'Product Class', value: p.value, category: 'PRODUCT' }))
    } else {
      potentialGaps.push({
        title: 'Product Classification Ambiguity',
        description: 'No explicit standardized product nomenclature identified in the specification.',
        severity: 'WARNING',
        suggestedClause: 'Declare the standard commercial product terminology and governing Indian Standard classification.',
      })
      suggestions.push('Clarify standard product classification.')
    }

    // 2. Application Context
    const appReq = requirements.find((r) => r.category === RequirementCategory.APPLICATION)
    if (appReq) {
      score += 15
      identifiedClauses.push({ name: 'Application', value: appReq.value, category: 'APPLICATION' })
    }

    // 3. Material Specifications
    const matReqs = requirements.filter((r) => r.category === RequirementCategory.MATERIAL)
    if (matReqs.length > 0) {
      score += 15
      matReqs.forEach((m) => identifiedClauses.push({ name: m.name, value: m.value, category: 'MATERIAL' }))
    }

    // 4. Performance & Electrical Characteristics
    const perfReqs = requirements.filter(
      (r) => r.category === RequirementCategory.PERFORMANCE || r.category === RequirementCategory.ELECTRICAL
    )
    if (perfReqs.length > 0) {
      score += 15
      perfReqs.forEach((p) => identifiedClauses.push({ name: p.name, value: p.value, category: 'PERFORMANCE' }))
    }

    // Domain checks
    const hasLighting = scoredStandards.some((s) => s.standard.standardNumber.includes('10322'))
    if (hasLighting) {
      if (!lower.includes('ip6') && !lower.includes('ip 6')) {
        potentialGaps.push({
          title: 'Ingress Protection (IP Rating) Missing',
          description: 'Outdoor roadway luminaire requires minimum IP65/IP66 enclosure protection.',
          severity: 'WARNING',
          suggestedClause: 'The luminaire shall have minimum Ingress Protection rating of IP66 per IS 10322 (Part 5/Sec 3) and IS/IEC 60529.',
        })
      } else {
        score += 10
      }
    }

    // Incorporate Gemini's semantic gaps
    if (geminiGaps && geminiGaps.length > 0) {
      for (const gap of geminiGaps) {
        const exists = potentialGaps.some((g) => g.title.toLowerCase() === gap.title.toLowerCase())
        if (!exists) {
          potentialGaps.push(gap)
          suggestions.push(gap.title)
        }
      }
    }

    const finalScore = Math.min(100, Math.max(35, score))

    return {
      scorePercent: finalScore,
      identifiedClauses,
      potentialGaps,
      suggestions,
    }
  }

  /**
   * Generate Comprehensive Executive Audit Report
   */
  private static async generateReport(
    analysisId: string,
    title: string,
    scoredStandards: any[],
    certifications: RecommendationResult['certifications'],
    warnings: string[],
    completeness?: RecommendationResult['completeness'],
    geminiExecutiveSummary?: string
  ) {
    const reportTitle = `Procurement Standards Compliance Report — ${title}`
    const topStandard = scoredStandards[0]?.standard
    const mandatoryCount = scoredStandards.filter((s) => s.isMandatory).length

    const summary =
      geminiExecutiveSummary ||
      `Executive Assessment: Technical evaluation of specification identified ${scoredStandards.length} applicable Indian Standards (${mandatoryCount} mandatory conformity standards). Primary governing standard is ${topStandard ? `${topStandard.standardNumber} (${topStandard.title})` : 'None'}. Specification completeness evaluated at ${completeness?.scorePercent ?? 85}%. Review identified ${warnings.length} specification clarity observations and statutory compliance requirements.`

    const findings = {
      generatedAt: new Date().toISOString(),
      aiModel: 'Gemini 3.6 Flash',
      standardsIdentified: scoredStandards.length,
      primaryStandard: topStandard ? topStandard.standardNumber : 'None',
      mandatoryStandards: scoredStandards.filter((s) => s.isMandatory).map((s) => s.standard.standardNumber),
      complianceStatus: certifications.some((c) => c.status === 'IDENTIFIED')
        ? 'STATUTORY_CONFORMITY_MANDATORY'
        : 'STANDARD_REVIEW_RECOMMENDED',
      specificationCompletenessScore: completeness?.scorePercent ?? 85,
      specificationGapsCount: warnings.length,
      potentialGaps: completeness?.potentialGaps ?? [],
      disclaimer:
        'Recommendations are intended to assist procurement review and should be verified against the latest applicable official standards and regulatory requirements.',
    }

    let reportId = `report_${analysisId}`
    try {
      const reportContent = JSON.stringify({ summary, findings }, null, 2)
      const report = await prisma.report.create({
        data: {
          analysisId,
          title: reportTitle,
          content: reportContent,
        },
      })
      reportId = report.id
    } catch {
      // Ignored in offline fallback
    }

    return {
      id: reportId,
      title: reportTitle,
      summary,
      findings,
    }
  }
}
