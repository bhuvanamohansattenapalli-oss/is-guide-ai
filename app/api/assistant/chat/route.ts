import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { GeminiService, CopilotMessage } from '@/lib/services/ai/gemini.service'
import { VERIFIED_STANDARDS_CATALOG, VerifiedStandardRecord } from '@/lib/data/verified-standards'

interface AssistantRequest {
  question: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  context?: {
    currentAnalysisId?: string
    currentStandardNumber?: string
    specText?: string
    currentAnalysis?: any
  }
  language?: string
}

function formatAnalysisContext(analysis: any, specText?: string): string {
  const parts: string[] = []
  if (analysis?.title) {
    parts.push(`Active Procurement Tender: ${analysis.title}`)
  }
  if (analysis?.requirements && Array.isArray(analysis.requirements) && analysis.requirements.length > 0) {
    const reqs = analysis.requirements
      .slice(0, 8)
      .map((r: any) => `- ${r.name || r.category}: ${r.value} (${r.isMandatory ? 'Mandatory' : 'Optional'})`)
      .join('\n')
    parts.push(`Extracted Tender Requirements:\n${reqs}`)
  }
  if (analysis?.recommendations && Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0) {
    const recs = analysis.recommendations
      .slice(0, 4)
      .map(
        (r: any) =>
          `- ${r.standardNumber}: ${r.title || ''} [Relevance Score: ${Math.round((r.systemRelevanceScore || 0) * 100)}%]`
      )
      .join('\n')
    parts.push(`Recommended Standards in Active Analysis:\n${recs}`)
  }
  if (
    analysis?.completeness?.potentialGaps &&
    Array.isArray(analysis.completeness.potentialGaps) &&
    analysis.completeness.potentialGaps.length > 0
  ) {
    const gaps = analysis.completeness.potentialGaps
      .slice(0, 3)
      .map((g: any) => `- [${g.severity || 'GAP'}] ${g.title}: ${g.description}`)
      .join('\n')
    parts.push(`Identified Specification Gaps:\n${gaps}`)
  }
  if (specText && specText.trim()) {
    parts.push(`Specification Text Excerpt:\n"""${specText.slice(0, 600)}"""`)
  }
  return parts.join('\n\n')
}

function scoreStandard(std: VerifiedStandardRecord, query: string): number {
  const q = query.toLowerCase()
  const numClean = std.standardNumber.toLowerCase().replace(/[^a-z0-9]/g, '')
  const titleClean = std.title.toLowerCase()
  const scopeClean = (std.scope || '').toLowerCase()
  const shortTitleClean = (std.shortTitle || '').toLowerCase()
  const categoryClean = (std.category || '').toLowerCase()

  let score = 0

  // 1. Direct standard number check (e.g. "is 4926", "4926", "is456")
  const isMatch = q.match(/is\s*(\d+)/i)
  if (isMatch && numClean.includes(isMatch[1])) {
    score += 100
  } else if (q.includes(numClean)) {
    score += 80
  }

  // 2. High-priority domain product & engineering terms
  // Ready mixed concrete
  if (
    (q.includes('ready mixed concrete') ||
      q.includes('ready-mixed') ||
      q.includes('ready mixed') ||
      q.includes('rmc')) &&
    numClean.includes('4926')
  ) {
    score += 120
  }

  // Plain and reinforced concrete
  if (
    (q.includes('plain and reinforced') ||
      q.includes('reinforced concrete') ||
      q.includes('rcc') ||
      (q.includes('concrete') && !q.includes('ready mixed') && !q.includes('rmc'))) &&
    numClean.includes('456')
  ) {
    score += 85
  }

  // Aggregates for concrete
  if (q.includes('aggregate') && numClean.includes('383')) {
    score += 90
  }

  // Cement (OPC 43)
  if ((q.includes('cement') || q.includes('opc')) && numClean.includes('8112')) {
    score += 90
  }

  // Concrete mix proportioning
  if ((q.includes('mix proportion') || q.includes('mix design')) && numClean.includes('10262')) {
    score += 90
  }

  // HDPE pipes & water piping
  if (
    (q.includes('hdpe') ||
      q.includes('high density polyethylene') ||
      (q.includes('pipe') && q.includes('water'))) &&
    numClean.includes('4984')
  ) {
    score += 110
  }

  // Structural steel / TMT rebar
  if ((q.includes('tmt') || q.includes('rebar') || q.includes('steel bar')) && numClean.includes('1786')) {
    score += 100
  }
  if ((q.includes('structural steel') || (q.includes('steel') && !q.includes('rebar') && !q.includes('tmt'))) && numClean.includes('2062')) {
    score += 95
  }

  // LED luminaires & street lighting
  if (
    (q.includes('street light') ||
      q.includes('luminaire') ||
      q.includes('outdoor led') ||
      q.includes('lighting')) &&
    numClean.includes('10322')
  ) {
    score += 100
  }

  // Safety helmets & PPE
  if ((q.includes('safety helmet') || q.includes('helmet')) && numClean.includes('2925')) {
    score += 100
  }
  if ((q.includes('safety footwear') || q.includes('safety shoes') || q.includes('shoes')) && numClean.includes('15298')) {
    score += 100
  }

  // Drinking water specification
  if ((q.includes('drinking water') || q.includes('potable water')) && numClean.includes('10500')) {
    score += 100
  }

  // Fire safety
  if ((q.includes('fire extinguisher') || q.includes('fire safety')) && numClean.includes('15683')) {
    score += 100
  }
  if (q.includes('fire alarm') && numClean.includes('2189')) {
    score += 100
  }

  // IP Code (IS/IEC 60529)
  if ((q.includes('ip rating') || q.includes('ip66') || q.includes('ingress protection')) && numClean.includes('60529')) {
    score += 95
  }

  // 3. Multilingual keyword support
  if ((q.includes('कंक्रीट') || q.includes('కాంక్రీట్')) && (numClean.includes('4926') || numClean.includes('456'))) {
    score += 70
  }
  if ((q.includes('पाइप') || q.includes('పైపు')) && numClean.includes('4984')) {
    score += 70
  }
  if ((q.includes('सरिया') || q.includes('స్టీల్')) && (numClean.includes('1786') || numClean.includes('2062'))) {
    score += 70
  }
  if ((q.includes('रोशनी') || q.includes('प्रकाश') || q.includes('వీధి దీపాలు')) && numClean.includes('10322')) {
    score += 70
  }

  // 4. Token matches against title, shortTitle, category, scope
  const stopwords = new Set([
    'what', 'which', 'where', 'when', 'who', 'how', 'why', 'is', 'are', 'was', 'were', 'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'with', 'from', 'by', 'about', 'standard', 'standards', 'indian', 'apply', 'applies', 'consider', 'this', 'that', 'should', 'would', 'could', 'please', 'tell', 'explain', 'give',
  ])
  const tokens = q
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopwords.has(w))

  for (const token of tokens) {
    if (titleClean.includes(token)) score += 15
    if (shortTitleClean.includes(token)) score += 12
    if (categoryClean.includes(token)) score += 5
    if (scopeClean.includes(token)) score += 5
  }

  return score
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AssistantRequest
    const { question, conversationHistory = [], context, language = 'en' } = body

    if (!question || typeof question !== 'string' || !question.trim()) {
      return errorResponse('BAD_REQUEST', 'Question is required', 400)
    }

    const qLower = question.toLowerCase().trim()

    // 1. Multilingual detection
    let detectedLang = language
    if (/[\u0900-\u097F]/.test(question)) {
      detectedLang = 'hi'
    } else if (/[\u0C00-\u0C7F]/.test(question)) {
      detectedLang = 'te'
    }

    // 2. Fetch verified standards from database (with fallback to verified in-memory catalog)
    let allStandards: VerifiedStandardRecord[] = []
    try {
      const dbStandards = await Promise.race([
        prisma.standard.findMany({
          where: { status: 'ACTIVE' },
          include: {
            versions: { where: { status: 'CURRENT' }, take: 1 },
            amendments: true,
            outgoingRelationships: {
              include: {
                targetStandard: {
                  select: { standardNumber: true, title: true, category: true },
                },
              },
            },
            incomingRelationships: {
              include: {
                sourceStandard: {
                  select: { standardNumber: true, title: true, category: true },
                },
              },
            },
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Prisma query timeout')), 2500)
        ),
      ])

      if (dbStandards && dbStandards.length > 0) {
        allStandards = dbStandards.map((s: any) => ({
          id: s.id,
          standardNumber: s.standardNumber,
          title: s.title,
          shortTitle: s.shortTitle,
          category: s.category,
          status: s.status,
          scope: s.scope,
          sourceUrl: s.sourceUrl,
          currentVersion: s.versions?.[0] || null,
          versions: s.versions || [],
          amendments: s.amendments || [],
          outgoingRelationships: s.outgoingRelationships || [],
          incomingRelationships: s.incomingRelationships || [],
        }))
      }
    } catch {
      // Fallback to verified catalog
    }

    if (allStandards.length === 0) {
      allStandards = [...VERIFIED_STANDARDS_CATALOG]
    }

    // 3. User Intent Classification
    // A: Mathematical question
    const isMath =
      /^\s*(\d+(\.\d+)?\s*[\+\-\*\/\^\%]\s*\d+(\.\d+)?|\d+%\s*of\s*\d+|sqrt\(\d+\)|what\s+is\s+(\d+[\+\-\*\/\^%]\d+|\d+%\s*of\s*\d+|sqrt\(\d+\)|\d+\s*[\+\-\*\/]\s*\d+))\s*\??$/i.test(
        question
      ) ||
      /^\s*(\d+\s*[\+\-\*\/]\s*\d+)\s*\??$/.test(question) ||
      /^\s*(calculate|compute|solve)\s+.*/i.test(question)

    // B: Conversational Greeting / Chit-chat
    const isGreeting =
      /^(hello|hi|hey|namaste|good\s*(morning|afternoon|evening)|how\s+are\s+you|who\s+are\s+you|tell\s+me\s+a\s+joke)\s*[\!\?.]*$/i.test(
        qLower
      )

    // C: General Educational / Technical / Conceptual definitions
    // e.g. "What is Python?", "What is React?", "What is an API?", "What is PostgreSQL?", "What is machine learning?",
    // "What is cloud computing?", "What is a database?", "What is GitHub?", "Explain HTTP in simple words", "What is artificial intelligence",
    // "What is BIS?", "What is procurement?", "Explain procurement in simple words"
    const isGeneralKnowledge =
      /^(what\s+is|what's|define|explain)\s+(python|react|an?\s+api|api|postgresql|postgres|machine\s+learning|cloud\s+computing|a\s+database|database|github|git|http|https|artificial\s+intelligence|ai|bis|procurement)\b/i.test(
        qLower
      ) ||
      /^(explain\s+(procurement|http|python|react|api|bis)\b)/i.test(qLower) ||
      qLower === 'what is bis?' ||
      qLower === 'what is bis' ||
      qLower === 'what is procurement?' ||
      qLower === 'what is procurement' ||
      qLower === 'explain procurement in simple words.' ||
      qLower === 'explain procurement in simple words'

    // D: Conversational Follow-up
    const isFollowUp =
      /^(explain\s+this\s+in\s+simple\s+words|explain\s+this\s+simply|explain\s+in\s+simple\s+words|can\s+you\s+elaborate|simplify\s+this|tell\s+me\s+more|summarize\s+this)/i.test(
        qLower
      )

    // E: Allied standards question
    const isAlliedQuery = /allied\s*standards?/i.test(qLower)

    // Determine if this is a standards / procurement query
    let isStandardsQuery = false

    if (isMath || isGreeting || isGeneralKnowledge) {
      isStandardsQuery = false
    } else if (isFollowUp) {
      // Check if previous turns were discussing standards
      const previousTurnsText = conversationHistory
        .map((m) => m.content)
        .join(' ')
        .toLowerCase()
      if (
        previousTurnsText.includes('is ') ||
        previousTurnsText.includes('standard') ||
        previousTurnsText.includes('concrete') ||
        previousTurnsText.includes('pipe') ||
        previousTurnsText.includes('steel')
      ) {
        isStandardsQuery = true
      } else {
        isStandardsQuery = false
      }
    } else {
      // Any query asking for standards, IS numbers, specifications, or product compliance
      const hasStandardsKeywords =
        qLower.includes('standard') ||
        qLower.includes('standards') ||
        qLower.includes('is ') ||
        /is\s*\d+/i.test(qLower) ||
        qLower.includes('bis') ||
        qLower.includes('qco') ||
        qLower.includes('isi') ||
        qLower.includes('crs') ||
        qLower.includes('tender') ||
        qLower.includes('procurement') ||
        qLower.includes('specification') ||
        qLower.includes('concrete') ||
        qLower.includes('steel') ||
        qLower.includes('pipe') ||
        qLower.includes('hdpe') ||
        qLower.includes('luminaire') ||
        qLower.includes('lighting') ||
        qLower.includes('helmet') ||
        qLower.includes('water') ||
        qLower.includes('cement') ||
        qLower.includes('rebar') ||
        qLower.includes('tmt') ||
        qLower.includes('test requirement') ||
        qLower.includes('current version') ||
        qLower.includes('allied') ||
        qLower.includes('gap') ||
        qLower.includes('certification') ||
        qLower.includes('which standard') ||
        qLower.includes('what standard') ||
        qLower.includes('applicable standard')

      isStandardsQuery = hasStandardsKeywords
    }

    // 4. Retrieve & rank candidate standards from verified catalog
    const relevantStandards: VerifiedStandardRecord[] = []

    if (isStandardsQuery) {
      // Also inspect previous conversation turns to provide context for follow-up questions
      const queryPlusHistory =
        question +
        ' ' +
        conversationHistory
          .slice(-3)
          .map((m) => m.content)
          .join(' ')

      const scored = allStandards
        .map((std) => ({
          standard: std,
          score: scoreStandard(std, queryPlusHistory),
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)

      const uniqueNumbers = new Set<string>()
      for (const item of scored) {
        if (!uniqueNumbers.has(item.standard.standardNumber)) {
          uniqueNumbers.add(item.standard.standardNumber)
          relevantStandards.push(item.standard)
        }
        if (relevantStandards.length >= 5) break
      }

      // If asked about allied standards specifically and no standard scored, provide prime verified references
      if (isAlliedQuery && relevantStandards.length === 0) {
        const primeStd = allStandards.find((s) => s.standardNumber === 'IS 456') || allStandards[0]
        if (primeStd) relevantStandards.push(primeStd)
      }
    }

    // 5. Build structured active analysis context (if present)
    const formattedAnalysisContext = formatAnalysisContext(
      context?.currentAnalysis,
      context?.specText
    )

    // 6. Call Gemini Dual-Mode Assistant
    let answerText = ''
    try {
      const geminiAnswer = await GeminiService.generateCopilotResponse(
        question,
        relevantStandards,
        {
          conversationHistory,
          currentAnalysisContext: formattedAnalysisContext,
          language: detectedLang,
          isStandardsQuery,
        }
      )

      if (geminiAnswer && geminiAnswer.trim().length > 0) {
        answerText = geminiAnswer.trim()
      }
    } catch (err) {
      console.warn('[AssistantChat] Gemini response error:', (err as Error).message)
    }

    // 7. Deterministic Fallback Handling
    // Guarantees zero-hallucination and adheres to strict fallback behavior
    if (!answerText) {
      if (isStandardsQuery) {
        if (relevantStandards.length === 0) {
          // STRICT ZERO-HALLUCINATION REQUIREMENT:
          // If no matching standard exists in the verified database, explicitly communicate insufficient data.
          if (detectedLang === 'hi') {
            answerText = `मेरे पास एक विश्वसनीय सिफारिश करने के लिए वर्तमान IS-Guide AI ज्ञानकोष में पर्याप्त सत्यापित मानक डेटा नहीं है। कृपया नवीनतम आधिकारिक बीआईएस (BIS) स्रोतों से सत्यापन करें।`
          } else if (detectedLang === 'te') {
            answerText = `విశ్వసనీయమైన సిఫార్సు చేయడానికి ప్రస్తుత IS-Guide AI నాలెడ్జ్ బేస్‌లో తగినంత ధృవీకరించబడిన ప్రమాణాల డేటా నా వద్ద లేదు. దయచేసి తాజా అధికారిక BIS మూలాల నుండి నిర్ధారించుకోండి.`
          } else {
            answerText = `I don't have sufficient verified standards data in the current IS-Guide AI knowledge base to make a reliable recommendation. Please verify against the latest official BIS sources.`
          }
        } else {
          // Deterministic procurement fallback using verified standards records
          const stdList = relevantStandards
            .map((s) => {
              const currentVer = s.currentVersion?.versionLabel || 'Current Edition'
              const relationships =
                s.outgoingRelationships
                  ?.map((r) => `${r.relationshipType}: ${r.targetStandard?.standardNumber}`)
                  .join(', ') || ''
              return `• **${s.standardNumber}**: ${s.title} [${s.category || 'Standard'}]\n  - *Current Version*: ${currentVer}${relationships ? `\n  - *Allied Standards*: ${relationships}` : ''}`
            })
            .join('\n\n')

          if (detectedLang === 'hi') {
            answerText = `सत्यापित भारतीय मानक डेटाबेस के अनुसार, आपके प्रश्न पर लागू होने वाले मानक निम्नलिखित हैं:\n\n${stdList}\n\nये मानक सार्वजनिक खरीद निविदाओं में गुणवत्ता नियंत्रण, तकनीकी सुरक्षा एवं परीक्षण मानदंडों को नियंत्रित करते हैं।\n\n*सिफारिशें केवल खरीद समीक्षा में सहायता के लिए हैं और इन्हें आधिकारिक मानकों एवं वैधानिक आवश्यकताओं के अनुसार सत्यापित किया जाना चाहिए।*`
          } else if (detectedLang === 'te') {
            answerText = `ధృవీకరించబడిన భారతీయ ప్రమాణాల డేటాబేస్ ప్రకారం, మీ ప్రశ్నకు వర్తించే ప్రమాణాలు క్రింది విధంగా ఉన్నాయి:\n\n${stdList}\n\nఈ ప్రమాణాలు ప్రభుత్వ కొనుగోళ్లలో నాణ్యత నియంత్రణ, భద్రత మరియు పరీక్షా ప్రమాణాలను నిర్దేశిస్తాయి.\n\n*సిఫార్సులు కొనుగోలు సమీక్షకు సహాయపడటానికి మాత్రమే ఉద్దేశించబడ్డాయి మరియు అధికారిక ప్రమాణాలు మరియు చట్టబద్ధమైన అవసరాలకు అనుగుణంగా ధృవీకరించబడాలి.*`
          } else {
            answerText = `Based on the verified IS-Guide AI knowledge base, the applicable standards are:\n\n${stdList}\n\nThese standards specify technical parameters, compliance benchmarks, and testing acceptance protocols for procurement tenders.\n\n*Recommendations are intended to assist procurement review and should be verified against the latest applicable official standards and regulatory requirements.*`
          }
        }
      } else {
        // General conversation / math / programming fallback
        // Per requirement: "AI conversation is temporarily unavailable. Your standards analysis features are still available."
        // Do NOT produce fabricated AI responses pretending they came from Gemini.
        if (detectedLang === 'hi') {
          answerText = `एआई वार्तालाप अस्थायी रूप से अनुपलब्ध है। आपकी मानक विश्लेषण सुविधाएँ अभी भी उपलब्ध हैं।`
        } else if (detectedLang === 'te') {
          answerText = `AI సంభాషణ తాత్కాలికంగా అందుబాటులో లేదు. మీ ప్రమాణాల విశ్లేషణ ఫీచర్లు ఇప్పటికీ అందుబాటులో ఉన్నాయి.`
        } else {
          answerText = `AI conversation is temporarily unavailable. Your standards analysis features are still available.`
        }
      }
    }

    // Dynamic suggested follow-up questions
    const suggestedQuestions =
      relevantStandards.length > 0
        ? [
            `What are the test requirements for ${relevantStandards[0].standardNumber}?`,
            `What is the current version and amendments for ${relevantStandards[0].standardNumber}?`,
            'What allied standards are related to this standard?',
            'What certifications might apply under Govt QCO?',
          ]
        : [
            'Which Indian Standard applies to ready mixed concrete?',
            'What standards apply to HDPE pipes?',
            'What is 25% of 800?',
            'What is BIS?',
            'What is React?',
          ]

    return successResponse(
      {
        answer: answerText,
        standards: relevantStandards.map((s) => ({
          id: s.id,
          standardNumber: s.standardNumber,
          title: s.title,
          category: s.category,
          currentVersion: s.currentVersion?.versionLabel || 'Current Edition',
        })),
        suggestedQuestions,
      },
      200
    )
  } catch (error) {
    return handleApiError(error)
  }
}
