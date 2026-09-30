import { z } from 'zod'
import { RequirementCategory, EvidenceType } from '@prisma/client'
import { VerifiedStandardRecord } from '@/lib/data/verified-standards'

// Primary model identifier: Gemini 3.6 Flash
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash'
const DEFAULT_TIMEOUT_MS = 5000

// ============================================================================
// ZOD SCHEMAS FOR STRUCTURED GEMINI VALIDATION
// ============================================================================

export const RequirementCategorySchema = z.enum([
  'PRODUCT',
  'APPLICATION',
  'MATERIAL',
  'DIMENSION',
  'PERFORMANCE',
  'SAFETY',
  'ENVIRONMENT',
  'TESTING',
  'ELECTRICAL',
  'CERTIFICATION',
  'OTHER',
])

export const ExtractedRequirementItemSchema = z.object({
  category: RequirementCategorySchema,
  name: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().nullable().optional(),
  isMandatory: z.boolean(),
  confidence: z.number().min(0).max(1),
})

export const RequirementsExtractionResponseSchema = z.object({
  detectedLanguage: z.enum(['en', 'hi', 'te', 'other']),
  productSummary: z.string(),
  searchKeywords: z.array(z.string()),
  requirements: z.array(ExtractedRequirementItemSchema).min(1),
})

export type RequirementsExtractionResponse = z.infer<typeof RequirementsExtractionResponseSchema>

export const CandidateEvaluationItemSchema = z.object({
  standardNumber: z.string().min(1),
  systemRelevanceScore: z.number().min(0).max(1),
  reason: z.string().min(5),
  isMandatory: z.boolean(),
  matchedRequirements: z.array(
    z.object({
      reqName: z.string(),
      notes: z.string(),
      evidenceType: z.enum([
        'SPECIFICATION_MATCH',
        'SCOPE_MATCH',
        'TECHNICAL_MATCH',
        'RELATIONSHIP',
        'VERSION',
        'OTHER',
      ]),
    })
  ),
})

export const SpecificationGapSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(['WARNING', 'RECOMMENDATION', 'NOTICE']),
  suggestedClause: z.string().min(1),
})

export const CandidateRankingResponseSchema = z.object({
  evaluations: z.array(CandidateEvaluationItemSchema),
  potentialGaps: z.array(SpecificationGapSchema),
  executiveSummary: z.string(),
})

export type CandidateRankingResponse = z.infer<typeof CandidateRankingResponseSchema>

// ============================================================================
// GEMINI 3.6 FLASH SERVICE IMPLEMENTATION
// ============================================================================

export class GeminiService {
  /**
   * Safe getter for server-side Gemini API Key
   * Never exposed to client or printed in logs
   */
  private static getApiKey(): string | null {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      return null
    }
    return key.trim()
  }

  /**
   * Internal structured call to Gemini API using responseMimeType: application/json
   */
  private static async callGeminiJson<T extends z.ZodTypeAny>(
    prompt: string,
    schema: T,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ): Promise<z.infer<T> | null> {
    const apiKey = this.getApiKey()
    if (!apiKey) {
      return null
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      })

      clearTimeout(timer)

      if (!response.ok) {
        console.warn(`[GeminiService] HTTP ${response.status} from model ${GEMINI_MODEL}, triggering deterministic fallback`)
        return null
      }

      const json = await response.json()
      const candidateText = json?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!candidateText || typeof candidateText !== 'string') {
        console.warn('[GeminiService] Empty candidate text in response, triggering fallback')
        return null
      }

      let parsedJson: unknown
      try {
        parsedJson = JSON.parse(candidateText.trim())
      } catch (parseErr) {
        console.warn('[GeminiService] JSON parse error in model output, triggering fallback:', (parseErr as Error).message)
        return null
      }

      const validation = schema.safeParse(parsedJson)
      if (!validation.success) {
        console.warn('[GeminiService] Schema validation failed for model response:', validation.error.format())
        return null
      }

      return validation.data
    } catch (err) {
      const errorMsg = (err as Error).name === 'AbortError' ? 'Timeout exceeded' : (err as Error).message
      console.warn(`[GeminiService] Call failed (${errorMsg}), triggering deterministic fallback`)
      return null
    }
  }

  /**
   * 1. Semantic Interpretation & Technical Requirements Extraction
   * Interprets procurement specifications in English, Hindi, or Telugu
   * Extracts structured requirements and domain keywords while preserving standard numbers.
   */
  static async interpretAndExtractRequirements(
    specText: string,
    languageHint?: string
  ): Promise<RequirementsExtractionResponse | null> {
    if (!specText || specText.trim().length < 15) {
      return null
    }

    const prompt = `You are the Lead Procurement AI Analyst for India's Bureau of Indian Standards (BIS) powered by Gemini 3.6 Flash.
Analyze this procurement tender specification text.

Input Text:
"""
${specText.slice(0, 4500)}
"""

Language Context: ${languageHint || 'Auto-detect (English, Hindi, or Telugu)'}

TASKS:
1. Semantically interpret the procurement specification.
2. Extract all explicit and implicit technical requirements into structured categories.
3. Preserves Indian Standard numbers VERBATIM (e.g. "IS 4984", "IS 456", "IS 10322", "IS 1786"). DO NOT translate, change, or invent standard numbers.
4. If input is in Hindi (हिन्दी) or Telugu (తెలుగు), translate the requirement values into concise technical English while recording the detectedLanguage.
5. Identify domain search keywords (e.g., "street light", "LED luminaire", "HDPE pipe", "rebar", "concrete", "IP66", "surge").

Respond strictly in valid JSON matching this schema:
{
  "detectedLanguage": "en" | "hi" | "te" | "other",
  "productSummary": "Concise 1-sentence description of the procurement item",
  "searchKeywords": ["keyword1", "keyword2", "keyword3"],
  "requirements": [
    {
      "category": "PRODUCT" | "APPLICATION" | "MATERIAL" | "DIMENSION" | "PERFORMANCE" | "SAFETY" | "ENVIRONMENT" | "TESTING" | "ELECTRICAL" | "CERTIFICATION" | "OTHER",
      "name": "Short requirement name (e.g. Luminaire Wattage, Base Material, Ingress Protection)",
      "value": "Technical specification value",
      "unit": "optional unit string or null",
      "isMandatory": true | false,
      "confidence": 0.95
    }
  ]
}`

    return this.callGeminiJson(prompt, RequirementsExtractionResponseSchema, 5000)
  }

  /**
   * 2. Semantic Relevance Scoring, Matching & Explanation against Verified Candidates
   * Grounded strictly in candidate standards retrieved from the verified standards database.
   * Gemini MUST NEVER invent any standard numbers not in candidateStandards.
   */
  static async rankAndExplainCandidates(
    specText: string,
    requirements: Array<{ category: RequirementCategory; name: string; value: string }>,
    candidateStandards: VerifiedStandardRecord[],
    language: string = 'en'
  ): Promise<CandidateRankingResponse | null> {
    if (!candidateStandards || candidateStandards.length === 0) {
      return null
    }

    // Format verified candidate standards as authoritative knowledge source
    const candidatesContext = candidateStandards
      .map(
        (c) =>
          `Standard: ${c.standardNumber}
Title: ${c.title}
Category: ${c.category}
Scope: ${c.scope}
Current Edition: ${c.currentVersion?.versionLabel || 'Active'}
Amendments: ${c.amendments.map((a) => a.amendmentNumber).join(', ') || 'None'}`
      )
      .join('\n---\n')

    const reqsContext = requirements.map((r) => `[${r.category}] ${r.name}: ${r.value}`).join('\n')

    const prompt = `You are the Lead Procurement AI Analyst for India's Bureau of Indian Standards (BIS) powered by Gemini 3.6 Flash.
Evaluate the semantic relevance of verified candidate standards against the user's procurement specification.

Procurement Specification:
"""
${specText.slice(0, 3000)}
"""

Extracted Requirements:
${reqsContext}

AUTHORITATIVE CANDIDATE STANDARDS IN VERIFIED DATABASE:
${candidatesContext}

CRITICAL GROUNDING RULES:
1. You MUST ONLY evaluate the candidate standards explicitly listed above.
2. NEVER invent, hallucinate, or reference any Indian Standard number not in the list above. Any invented standard number will be rejected by our verification system.
3. For each candidate standard, calculate a "System relevance score" between 0.0 and 1.0 (Note: This is an application-generated score, NOT an official BIS score).
   - If the candidate is highly relevant or directly cited, score between 0.85 and 0.98.
   - If the candidate is an essential related safety/test standard (e.g. IS/IEC 60529 for lighting IP rating), score between 0.70 and 0.90.
   - If weakly relevant, score below 0.50.
4. Provide authoritative, procurement-oriented reasoning explaining why each standard applies, referencing specific parameters.
5. Identify potentially missing specification parameters (e.g., missing IP rating, surge protection, test certifications, exposure conditions).
6. Generate an executive assessment summary for procurement officers.
7. ${language === 'hi' ? 'Write the reasons, gap descriptions, and executiveSummary in Hindi (हिन्दी). Preserve Indian Standard numbers (e.g., "IS 4984") and official English standard titles unchanged.' : language === 'te' ? 'Write the reasons, gap descriptions, and executiveSummary in Telugu (తెలుగు). Preserve Indian Standard numbers (e.g., "IS 4984") and official English standard titles unchanged.' : 'Write in English.'}


Respond strictly in valid JSON matching this schema:
{
  "evaluations": [
    {
      "standardNumber": "Exact standardNumber from the candidate list above",
      "systemRelevanceScore": 0.95,
      "reason": "Authoritative explanation grounded in standard scope and tender specification",
      "isMandatory": true | false,
      "matchedRequirements": [
        {
          "reqName": "Name of matched requirement",
          "notes": "How this standard satisfies this requirement",
          "evidenceType": "SPECIFICATION_MATCH" | "SCOPE_MATCH" | "TECHNICAL_MATCH" | "RELATIONSHIP" | "VERSION" | "OTHER"
        }
      ]
    }
  ],
  "potentialGaps": [
    {
      "title": "Title of missing parameter",
      "description": "Explanation of why this parameter is critical",
      "severity": "WARNING" | "RECOMMENDATION" | "NOTICE",
      "suggestedClause": "Suggested tender specification clause to insert"
    }
  ],
  "executiveSummary": "Concise executive overview of the standards alignment, mandatory compliance requirements, and specification readiness."
}`

    const result = await this.callGeminiJson(prompt, CandidateRankingResponseSchema, 5500)
    if (!result) return null

    // STRICT GROUNDING FILTER: Discard any standard number that is NOT in candidateStandards
    const validCandidateNumbers = new Set(candidateStandards.map((c) => c.standardNumber.toLowerCase().trim()))

    const verifiedEvaluations = result.evaluations.filter((ev) =>
      validCandidateNumbers.has(ev.standardNumber.toLowerCase().trim())
    )

    if (verifiedEvaluations.length === 0) {
      console.warn('[GeminiService] No evaluations matched verified candidate standards, triggering fallback')
      return null
    }

    return {
      ...result,
      evaluations: verifiedEvaluations,
    }
  }

  /**
   * 3. Grounded Conversational Copilot for "Ask IS-Guide AI" (/api/assistant/chat)
   * Powered by Gemini 3.6 Flash.
   * Grounded strictly in candidate standards retrieved from the database.
   */
  static async generateCopilotResponse(
    question: string,
    candidateStandards: VerifiedStandardRecord[],
    options?: {
      currentAnalysisContext?: string
      language?: string
    }
  ): Promise<string | null> {
    const apiKey = this.getApiKey()
    if (!apiKey) return null

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

    let standardsContext = ''
    if (candidateStandards.length > 0) {
      standardsContext = candidateStandards
        .map(
          (s) =>
            `- ${s.standardNumber}: ${s.title} [Category: ${s.category}]. Current Version: ${s.currentVersion?.versionLabel || 'Active'}. Scope: ${s.scope}. Related Standards: ${s.outgoingRelationships.map((r) => `${r.relationshipType}: ${r.targetStandard.standardNumber}`).join(', ') || 'None'}`
        )
        .join('\n')
    } else {
      standardsContext = 'No matching Indian Standards found in the verified database for this specific query.'
    }

    const targetLang = options?.language || 'en'

    const prompt = `You are the IS-Guide AI Procurement Intelligence Assistant powered by Gemini 3.6 Flash for India's Bureau of Indian Standards (BIS) and public procurement intelligence.
You function as a versatile, expert conversational AI chatbot capable of answering ANY user query, including:
- Technical specifications, engineering parameters, material grades, and tolerances.
- Public procurement procedures, tender drafting, bid evaluation criteria, GeM portal norms, and GFR (General Financial Rules).
- Bureau of Indian Standards (BIS), ISI Mark, Compulsory Registration Scheme (CRS), and Quality Control Orders (QCO).
- Comparisons between technologies, products, standards, and testing methods.
- General questions, explanations, greetings, and conversational assistance.

User Question: "${question}"

GROUNDING STANDARDS IN VERIFIED DATABASE (if applicable):
${standardsContext}

${options?.currentAnalysisContext ? `Additional Tender Context:\n${options.currentAnalysisContext}` : ''}

CAPABILITIES & GROUNDING RULES:
1. Act as a friendly, expert, helpful, and highly articulate chatbot. Answer the user's question directly, clearly, and thoroughly.
2. If the user asks general questions, technical concepts, procurement best practices, or drafting assistance, answer knowledgeably and comprehensively.
3. When referencing Indian Standards (BIS), prioritize the verified standards listed above and NEVER invent or hallucinate non-existent Indian Standard numbers.
4. Support English, Hindi (हिन्दी), and Telugu (తెలుగు) based on the user's question language and target interface language (${targetLang}):
   - If the user asks in Hindi or target interface language is 'hi', answer naturally and thoroughly in Hindi (हिन्दी).
   - If the user asks in Telugu or target interface language is 'te', answer naturally and thoroughly in Telugu (తెలుగు).
   - Otherwise, answer in clear technical English.
5. In ALL languages, preserve official Indian Standard identifiers in Latin script standard format (e.g., "IS 4984", "IS 456", "IS 10322", "IS 1786") and official standard titles unchanged.
6. If the question pertains to procurement tenders or standards compliance, end your response with this advisory note:
"*Recommendations are intended to assist procurement review and should be verified against the latest applicable official standards and regulatory requirements.*"`

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: 800,
          },
        }),
      })

      clearTimeout(timer)

      if (!response.ok) {
        console.warn(`[GeminiService.generateCopilotResponse] HTTP ${response.status}, using deterministic fallback`)
        return null
      }

      const resData = await response.json()
      const answerText = resData?.candidates?.[0]?.content?.parts?.[0]?.text
      if (answerText && typeof answerText === 'string' && answerText.trim()) {
        return answerText.trim()
      }
      return null
    } catch (err) {
      console.warn('[GeminiService.generateCopilotResponse] Call note, using deterministic fallback:', (err as Error).message)
      return null
    }
  }
}
