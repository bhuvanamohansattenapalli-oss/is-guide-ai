import { z } from 'zod'
import { RequirementCategory, EvidenceType } from '@prisma/client'
import { VerifiedStandardRecord } from '@/lib/data/verified-standards'

// Primary model identifier: Gemini 3.6 Flash
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash'
const DEFAULT_TIMEOUT_MS = 5000

export interface CopilotMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface CopilotOptions {
  conversationHistory?: CopilotMessage[]
  currentAnalysisContext?: string
  language?: string
  isStandardsQuery?: boolean
}

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

    const modelsToTry = [
      GEMINI_MODEL,
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
    ].filter((v, i, a) => a.indexOf(v) === i)

    for (const model of modelsToTry) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

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
          console.warn(`[GeminiService] HTTP ${response.status} from model ${model}, trying next model`)
          continue
        }

        const json = await response.json()
        const candidateText = json?.candidates?.[0]?.content?.parts?.[0]?.text
        if (!candidateText || typeof candidateText !== 'string') {
          continue
        }

        let parsedJson: unknown
        try {
          parsedJson = JSON.parse(candidateText.trim())
        } catch (parseErr) {
          continue
        }

        const validation = schema.safeParse(parsedJson)
        if (!validation.success) {
          continue
        }

        return validation.data
      } catch (err) {
        continue
      }
    }

    return null
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
   * Dual-mode conversational assistant:
   * Mode 1: General conversation, mathematics, programming, general tech/science/educational questions.
   * Mode 2: Procurement & Indian Standards intelligence, strictly grounded in verified database records.
   */
  static async generateCopilotResponse(
    question: string,
    candidateStandards: VerifiedStandardRecord[],
    options?: CopilotOptions
  ): Promise<string | null> {
    const apiKey = this.getApiKey()
    if (!apiKey) return null

    const targetLang = options?.language || 'en'

    const systemInstructionText = `You are IS-Guide AI, a helpful general-purpose conversational AI assistant with specialized expertise in Indian procurement standards.

Answer general questions normally, including mathematics, programming, science, technology, education, and everyday questions.

When the user asks about Indian Standards, procurement specifications, BIS standards, certification, QCOs, normative references, or related procurement compliance, use the verified IS-Guide AI knowledge base and available analysis context.

Never fabricate an Indian Standard number, title, version, amendment, certification requirement, or regulatory claim.

Clearly distinguish verified database information from general knowledge.

Be concise for simple questions and provide detailed explanations when the user asks for them.

Maintain conversational context and answer follow-up questions naturally.

Respect the user's selected language.

============================================================
CORE BEHAVIOR & MODES
============================================================

MODE 1 — GENERAL CONVERSATION:
- Answer ordinary, general, educational, and technical questions naturally, accurately, and conversationally.
- Never respond: "I can only answer procurement questions." You behave as a genuine general AI assistant.
- Examples:
  - User: "Hello" -> Friendly greeting.
  - User: "How are you?" -> "I'm doing well! How can I help you today?"
  - User: "What is 1 + 1?" -> "1 + 1 = 2" (or "2")
  - User: "What is Python?" -> Explain Python as a popular high-level programming language.
  - User: "What is React?" -> Explain React as a front-end JavaScript library for user interfaces.
  - User: "What is an API?" -> Explain Application Programming Interfaces clearly.
  - User: "What is PostgreSQL?" -> Explain PostgreSQL as an open-source object-relational database.
  - User: "What is machine learning?" -> Explain machine learning clearly.
  - User: "What is cloud computing?" -> Explain cloud computing clearly.
  - User: "What is a database?" -> Explain databases clearly.
  - User: "What is GitHub?" -> Explain GitHub clearly.
  - User: "Explain HTTP in simple words." -> Explain HTTP in simple terms.
  - User: "What is artificial intelligence?" -> Explain AI clearly.
  - User: "Explain procurement in simple words." -> Explain procurement in clear, simple terms.
  - User: "What is BIS?" -> Provide a clear factual explanation of the Bureau of Indian Standards (the National Standards Body of India established under the BIS Act 2016).
  - User: "Tell me a joke." -> Natural conversational joke.
- Mathematical Questions:
  - Answer calculations naturally (e.g. 1 + 1, 25 * 4, 100 / 5, 10% of 500, 25% of 800, sqrt(144), simple algebra, unit conversions).
  - For straightforward calculations, give the correct answer directly.
  - For more complex calculations, show the calculation steps clearly when useful.
  - Do NOT force mathematical questions through standards recommendations.

MODE 2 — PROCUREMENT / INDIAN-STANDARDS ASSISTANCE:
- When the user asks about Indian Standards, procurement specifications, BIS standards, certification, QCOs, normative references, allied standards, or related procurement compliance:
  - Ground your answer in the verified standards database provided in your context.
  - When the user asks which Indian Standard applies to a product or material:
    CRITICAL ZERO-HALLUCINATION RULE:
    You MUST ONLY recommend standards from the verified standards database provided in your context.
    If the verified database records provided in your context do NOT contain an applicable standard for that product or material, you MUST state:
    "I don't have sufficient verified standards data in the current IS-Guide AI knowledge base to make a reliable recommendation. Please verify against the latest official BIS sources."
    NEVER invent, hallucinate, or fabricate an Indian Standard number, title, version, amendment, certification requirement, or regulatory claim.
  - When verified standards are provided in context, explain their scope, current edition/version, amendments, certification requirements (ISI mark / CRS / QCO), and normative relationships accurately.
  - When asked about "allied standards", explain the concept of allied / companion / normative reference standards and detail any related standards linked in the context.
  - When asked to "Analyze this procurement specification", evaluate the tender specification or active analysis context against verified standards, identifying gaps, mandatory standards, and test requirements.

CONVERSATIONAL CONTEXT & ACTIVE ANALYSIS:
- Maintain conversational memory across turns within the session.
- Understand follow-up references naturally (e.g., if the user previously asked about a water pipeline and asks "What about the test requirements?", understand it refers to water pipes; if the user asks "Explain IS 4984" and then "What is its current version?", answer about IS 4984; if the user asks "Explain this in simple words.", simplify the previous explanation).
- When active procurement analysis context is provided, answer questions regarding its title, extracted requirements, recommended standards, scores, and specification gaps.

LANGUAGE RULES:
- Target language: ${targetLang} ('en', 'hi', or 'te').
- If 'hi' is selected or user asks in Hindi, answer in Hindi (हिन्दी).
- If 'te' is selected or user asks in Telugu, answer in Telugu (తెలుగు).
- CRITICAL: Technical identifiers such as "IS 456", "IS 4984", "IS 10322", "IS 4926", "IS 1786", "IS 2062", "BIS", "CRS", "QCO", "API", "PostgreSQL", "React", "Python", etc. MUST ALWAYS remain in standard Latin script unchanged in all languages.`

    // 1. Build context additions
    let contextBlock = ''
    if (candidateStandards.length > 0) {
      contextBlock +=
        `\n\n[VERIFIED STANDARDS DATABASE RECORDS IN CONTEXT]:\n` +
        candidateStandards
          .map((s) => {
            const related =
              s.outgoingRelationships
                ?.map((r) => `${r.relationshipType}: ${r.targetStandard?.standardNumber} (${r.targetStandard?.title})`)
                .join('; ') || 'None'
            const currentVer = s.currentVersion?.versionLabel || 'Current Edition'
            const amendments =
              s.amendments?.map((a) => `${a.amendmentNumber}: ${a.description}`).join('; ') || 'None'
            return `- ${s.standardNumber}: ${s.title} [Category: ${s.category || 'Standard'}]. Current Version: ${currentVer}. Amendments: ${amendments}. Scope: ${s.scope || 'N/A'}. Allied/Related Standards: ${related}`
          })
          .join('\n')
    } else if (options?.isStandardsQuery) {
      contextBlock += `\n\n[VERIFIED STANDARDS DATABASE RECORDS IN CONTEXT]:\nNo matching Indian Standards found in the verified database for this specific item.`
    }

    if (options?.currentAnalysisContext) {
      contextBlock += `\n\n[ACTIVE PROCUREMENT ANALYSIS CONTEXT]:\n${options.currentAnalysisContext}`
    }

    const currentTurnText = `${question}${contextBlock}`

    // 2. Build multi-turn contents array with proper role alternation
    const rawTurns: Array<{ role: 'user' | 'model'; text: string }> = []

    if (options?.conversationHistory && options.conversationHistory.length > 0) {
      // Include up to last 8 turns of conversation history
      const recentHistory = options.conversationHistory.slice(-8)
      for (const turn of recentHistory) {
        if (!turn.content || !turn.content.trim()) continue
        rawTurns.push({
          role: turn.role === 'assistant' ? 'model' : 'user',
          text: turn.content.trim(),
        })
      }
    }

    // Append the latest user turn
    rawTurns.push({
      role: 'user',
      text: currentTurnText,
    })

    // Sanitize to ensure alternating roles starting with 'user'
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
    for (const turn of rawTurns) {
      if (contents.length === 0) {
        if (turn.role === 'user') {
          contents.push({ role: 'user', parts: [{ text: turn.text }] })
        }
      } else {
        const last = contents[contents.length - 1]
        if (last.role === turn.role) {
          last.parts[0].text += '\n\n' + turn.text
        } else {
          contents.push({ role: turn.role, parts: [{ text: turn.text }] })
        }
      }
    }

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: currentTurnText }] })
    }

    // Models to try in order of preference (resilient fallback on rate-limits / demand spikes)
    const modelsToTry = [
      GEMINI_MODEL,
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
    ].filter((v, i, a) => a.indexOf(v) === i)

    for (const model of modelsToTry) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 8000)

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstructionText }],
            },
            contents,
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1000,
            },
          }),
        })

        clearTimeout(timer)

        if (!response.ok) {
          console.warn(`[GeminiService.generateCopilotResponse] HTTP ${response.status} from ${model}, trying next model`)
          continue
        }

        const resData = await response.json()
        const answerText = resData?.candidates?.[0]?.content?.parts?.[0]?.text
        if (answerText && typeof answerText === 'string' && answerText.trim()) {
          return answerText.trim()
        }
      } catch (err) {
        console.warn(`[GeminiService.generateCopilotResponse] Call failed for ${model}:`, (err as Error).message)
        continue
      }
    }

    return null
  }
}
