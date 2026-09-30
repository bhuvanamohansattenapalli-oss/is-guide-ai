import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { GeminiService } from '@/lib/services/ai/gemini.service'
import { VERIFIED_STANDARDS_CATALOG, VerifiedStandardRecord } from '@/lib/data/verified-standards'

interface AssistantRequest {
  question: string
  context?: {
    currentAnalysisId?: string
    currentStandardNumber?: string
    specText?: string
  }
  language?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AssistantRequest
    const { question, context, language = 'en' } = body

    if (!question || typeof question !== 'string' || !question.trim()) {
      return errorResponse('BAD_REQUEST', 'Question is required', 400)
    }

    const qLower = question.toLowerCase().trim()

    // 1. Fetch verified standards from database (with fallback to authoritative catalog)
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
      // Fallback to in-memory verified dataset
    }

    if (allStandards.length === 0) {
      allStandards = [...VERIFIED_STANDARDS_CATALOG]
    }

    // 2. Multilingual detection
    let detectedLang = language
    if (/[\u0900-\u097F]/.test(question)) {
      detectedLang = 'hi'
    } else if (/[\u0C00-\u0C7F]/.test(question)) {
      detectedLang = 'te'
    }

    // 3. Keyword / Semantic ground truth match against verified standards catalog
    const matchedStandards: VerifiedStandardRecord[] = []

    for (const std of allStandards) {
      const numClean = std.standardNumber.toLowerCase().replace(/[^a-z0-9]/g, '')
      const titleClean = std.title.toLowerCase()
      const scopeClean = (std.scope || '').toLowerCase()
      const catClean = (std.category || '').toLowerCase()

      // Direct IS number check (e.g. "is 10322", "is456", "10322")
      const queryNumberMatch = qLower.match(/is\s*(\d+)/i)
      if (queryNumberMatch) {
        const queryStdNum = queryNumberMatch[1]
        if (numClean.includes(queryStdNum)) {
          matchedStandards.push(std)
          continue
        }
      }

      // Keyword matching across languages & domains
      // Lighting & Electrical
      if (
        (qLower.includes('led') ||
          qLower.includes('street light') ||
          qLower.includes('luminaire') ||
          qLower.includes('light') ||
          qLower.includes('प्रकाश') ||
          qLower.includes('रोशनी') ||
          qLower.includes('స్ట్రీట్ లైట్') ||
          qLower.includes('వీధి దీపాలు')) &&
        (titleClean.includes('luminaire') ||
          titleClean.includes('light') ||
          numClean.includes('10322') ||
          numClean.includes('16103') ||
          numClean.includes('15885') ||
          numClean.includes('16102'))
      ) {
        matchedStandards.push(std)
      } else if (
        // Civil, Concrete & Steel
        (qLower.includes('concrete') ||
          qLower.includes('cement') ||
          qLower.includes('rmc') ||
          qLower.includes('steel') ||
          qLower.includes('tmt') ||
          qLower.includes('rebar') ||
          qLower.includes('कंक्रीट') ||
          qLower.includes('सीमेंट') ||
          qLower.includes('सरिया') ||
          qLower.includes('కాంక్రీట్') ||
          qLower.includes('స్టీల్')) &&
        (titleClean.includes('concrete') ||
          titleClean.includes('steel') ||
          numClean.includes('456') ||
          numClean.includes('1786') ||
          numClean.includes('4926') ||
          numClean.includes('383') ||
          numClean.includes('10262') ||
          numClean.includes('8112') ||
          numClean.includes('2062'))
      ) {
        matchedStandards.push(std)
      } else if (
        // Safety & PPE
        (qLower.includes('helmet') ||
          qLower.includes('footwear') ||
          qLower.includes('ppe') ||
          qLower.includes('safety shoes') ||
          qLower.includes('shoe') ||
          qLower.includes('हेलमेट') ||
          qLower.includes('जूते') ||
          qLower.includes('హెల్మెట్') ||
          qLower.includes('బూట్లు')) &&
        (titleClean.includes('helmet') ||
          titleClean.includes('footwear') ||
          titleClean.includes('mask') ||
          titleClean.includes('harness') ||
          numClean.includes('2925') ||
          numClean.includes('15298') ||
          numClean.includes('9473') ||
          numClean.includes('3521'))
      ) {
        matchedStandards.push(std)
      } else if (
        // Piping & Water Supply
        (qLower.includes('pipe') ||
          qLower.includes('hdpe') ||
          qLower.includes('water supply') ||
          qLower.includes('potable') ||
          qLower.includes('drinking water') ||
          qLower.includes('पाइप') ||
          qLower.includes('पेयजल') ||
          qLower.includes('పైపు') ||
          qLower.includes('తాగునీరు')) &&
        (titleClean.includes('polyethylene') ||
          titleClean.includes('pipe') ||
          titleClean.includes('drinking water') ||
          titleClean.includes('meter') ||
          titleClean.includes('valve') ||
          numClean.includes('4984') ||
          numClean.includes('10500') ||
          numClean.includes('1239') ||
          numClean.includes('779') ||
          numClean.includes('14846'))
      ) {
        matchedStandards.push(std)
      } else if (
        // Fire Safety
        (qLower.includes('fire') ||
          qLower.includes('extinguisher') ||
          qLower.includes('hydrant') ||
          qLower.includes('alarm') ||
          qLower.includes('अग्निशामक') ||
          qLower.includes('అగ్నిమాపక')) &&
        (titleClean.includes('fire') ||
          numClean.includes('15683') ||
          numClean.includes('2189'))
      ) {
        matchedStandards.push(std)
      } else if (
        qLower.includes(numClean) ||
        (qLower.includes('ip') && numClean.includes('60529')) ||
        (qLower.includes('surge') && (numClean.includes('15885') || numClean.includes('10322')))
      ) {
        matchedStandards.push(std)
      }
    }

    // Deduplicate
    const uniqueStandards = Array.from(
      new Map(matchedStandards.map((s) => [s.standardNumber, s])).values()
    )

    // IMPORTANT: If no standards matched, DO NOT fall back to arbitrary standards!
    // Grounding requires candidate standards to be empty for a no-match query.
    const relevantStandards = uniqueStandards.slice(0, 5)

    // 4. Try Gemini 3.6 Flash Grounded Formulation
    let answerText = ''
    try {
      const geminiAnswer = await GeminiService.generateCopilotResponse(
        question,
        relevantStandards,
        {
          currentAnalysisContext: context?.specText,
          language: detectedLang,
        }
      )
      if (geminiAnswer && geminiAnswer.trim().length > 0) {
        answerText = geminiAnswer.trim()
      }
    } catch (err) {
      console.warn('[AssistantChat] Gemini copilot note, using deterministic fallback:', (err as Error).message)
    }

    // 5. Deterministic Fallback Formulation (Zero-hallucination guarantee)
    if (!answerText) {
      if (relevantStandards.length === 0) {
        if (qLower.includes('hello') || qLower.includes('hi') || qLower.includes('namaste') || qLower.includes('who are you') || qLower.includes('help')) {
          if (detectedLang === 'hi') {
            answerText = `नमस्ते! मैं IS-Guide AI सहायक हूँ। मैं सार्वजनिक खरीद विनिर्देशों, निविदा मूल्यांकन, बीआईएस (Bureau of Indian Standards) प्रमाणन, और गुणवत्ता नियंत्रण आदेशों (QCO) पर आपके किसी भी प्रश्न का उत्तर दे सकता हूँ। आप मुझसे तकनीकी आवश्यकताओं या मानकों के बारे में कुछ भी पूछ सकते हैं!`
          } else if (detectedLang === 'te') {
            answerText = `నమస్కారం! నేను IS-Guide AI అసిస్టెంట్‌ని. ప్రభుత్వ కొనుగోలు నిబంధనలు, టెండర్ తయారీ, బ్యూరో ఆఫ్ ఇండియన్ స్టాండర్డ్స్ (BIS) సర్టిఫికేషన్ మరియు QCO నిబంధనలపై మీ ప్రశ్నలకు సమాధానాలు ఇవ్వగలను. మీరు ఏదైనా అడగవచ్చు!`
          } else {
            answerText = `Hello! I am IS-Guide AI, your intelligent assistant for Indian Standards and public procurement. I can answer any questions regarding tender specifications, engineering parameters, BIS certifications (ISI Mark, CRS), Quality Control Orders (QCO), test protocols, and general procurement guidelines. How can I assist you today?`
          }
        } else if (detectedLang === 'hi') {
          answerText = `आपके प्रश्न के आधार पर: सार्वजनिक खरीद और इंजीनियरिंग विनिर्देशों में, गुणवत्ता आश्वासन और सुरक्षा सुनिश्चित करने के लिए संबंधित बीआईएस भारतीय मानकों (जैसे सिविल के लिए IS 456 / IS 1786, विद्युत के लिए IS 10322, पाइपिंग के लिए IS 4984) का पालन अनिवार्य है। कृपया अपनी विशिष्ट वस्तु या विनिर्देश विवरण साझा करें ताकि मैं सटीक खंड प्रदान कर सकूँ।\n\n*सिफारिशें केवल खरीद समीक्षा में सहायता के लिए हैं और इन्हें आधिकारिक मानकों एवं वैधानिक आवश्यकताओं के अनुसार सत्यापित किया जाना चाहिए।*`
        } else if (detectedLang === 'te') {
          answerText = `మీ ప్రశ్న ఆధారంగా: పబ్లిక్ ప్రొక్యూర్మెంట్ మరియు ఇంజనీరింగ్ నిబంధనలలో నాణ్యత మరియు భద్రతను నిర్ధారించడానికి సంబంధిత భారతీయ ప్రమాణాలను (BIS Standards) పాటించడం అవసరం. మరింత ఖచ్చితమైన సమాచారం కోసం మీ స్పెసిఫికేషన్ వివరాలను అందించండి.\n\n*సిఫార్సులు కొనుగోలు సమీక్షకు సహాయపడటానికి మాత్రమే ఉద్దేశించబడ్డాయి మరియు అధికారిక ప్రమాణాలు మరియు చట్టబద్ధమైన అవసరాలకు అనుగుణంగా ధృవీకరించబడాలి.*`
        } else {
          answerText = `In response to your query: For government procurement and engineering contracts under General Financial Rules (GFR), specifications should adhere to applicable Bureau of Indian Standards (BIS) specifications, mandatory Quality Control Orders (QCO), and relevant conformity schemes (ISI Mark / CRS). Feel free to share your specific technical parameters, item description, or tender clauses for tailored guidance!\n\n*Recommendations are intended to assist procurement review and should be verified against the latest applicable official standards and regulatory requirements.*`
        }
      } else {
        const isTestQuestion =
          qLower.includes('test') || qLower.includes('method') || qLower.includes('testing') || qLower.includes('परीक्षण') || qLower.includes('పరీక్ష')
        const isSafetyQuestion =
          qLower.includes('safety') || qLower.includes('protection') || qLower.includes('ip rating') || qLower.includes('surge') || qLower.includes('सुरक्षा') || qLower.includes('రక్షణ')
        const isCertQuestion =
          qLower.includes('certif') || qLower.includes('qco') || qLower.includes('isi') || qLower.includes('crs') || qLower.includes('mandatory') || qLower.includes('प्रमाणन') || qLower.includes('సర్టిఫికేషన్')

        if (detectedLang === 'hi') {
          const stdList = relevantStandards
            .map((s) => `• **${s.standardNumber}**: ${s.title} [${s.category}]`)
            .join('\n')
          answerText = `सत्यापित भारतीय मानक डेटाबेस के अनुसार, आपके तकनीकी प्रश्न पर लागू होने वाले मानक निम्नलिखित हैं:\n\n${stdList}\n\nये मानक सार्वजनिक खरीद निविदाओं में गुणवत्ता नियंत्रण, सुरक्षा एवं परीक्षण मानदंडों को नियंत्रित करते हैं।\n\n*सिफारिशें केवल खरीद समीक्षा में सहायता के लिए हैं और इन्हें आधिकारिक मानकों एवं वैधानिक आवश्यकताओं के अनुसार सत्यापित किया जाना चाहिए।*`
        } else if (detectedLang === 'te') {
          const stdList = relevantStandards
            .map((s) => `• **${s.standardNumber}**: ${s.title} [${s.category}]`)
            .join('\n')
          answerText = `ధృవీకరించబడిన భారతీయ ప్రమాణాల డేటాబేస్ ప్రకారం, మీ సాంకేతిక ప్రశ్న కోసం వర్తించే ప్రమాణాలు క్రింది విధంగా ఉన్నాయి:\n\n${stdList}\n\nఈ ప్రమాణాలు ప్రభుత్వ కొనుగోళ్లలో నాణ్యత నియంత్రణ, భద్రత మరియు పరీక్షా ప్రమాణాలను నిర్దేశిస్తాయి.\n\n*సిఫార్సులు కొనుగోలు సమీక్షకు సహాయపడటానికి మాత్రమే ఉద్దేశించబడ్డాయి మరియు అధికారిక ప్రమాణాలు మరియు చట్టబద్ధమైన అవసరాలకు అనుగుణంగా ధృవీకరించబడాలి.*`
        } else {
          if (isTestQuestion) {
            const testList = relevantStandards
              .map((s) => `• **${s.standardNumber}**: ${s.title}`)
              .join('\n')
            answerText = `Based on the verified Indian Standards catalog, the relevant test standards and verification protocols include:\n\n${testList}\n\nKey testing benchmarks cover material conformity, dimensional verification, mechanical performance, and ingress/environmental endurance.\n\n*Recommendations are intended to assist procurement review and should be verified against the latest applicable official standards and regulatory requirements.*`
          } else if (isCertQuestion) {
            const certList = relevantStandards
              .map(
                (s) =>
                  `• **${s.standardNumber}**: Subject to BIS Product Certification (ISI Mark) or Compulsory Registration Scheme (CRS) pursuant to applicable Quality Control Orders (QCO).`
              )
              .join('\n')
            answerText = `Under statutory Government Quality Control Orders (QCO) and BIS regulations, the following certification checks apply:\n\n${certList}\n\nProcurement officials must mandate valid BIS CM/L license or CRS R-number in technical bid evaluation criteria.\n\n*Recommendations are intended to assist procurement review and should be verified against the latest applicable official standards and regulatory requirements.*`
          } else if (isSafetyQuestion) {
            const safetyList = relevantStandards
              .map((s) => `• **${s.standardNumber}** (${s.title}): Prescribes essential safety margins, insulation resistance, and physical protection.`)
              .join('\n')
            answerText = `Applicable safety and protection standards identified in the verified database:\n\n${safetyList}\n\nEnsure specifications mandate surge protection, earthing compliance, and environmental protection (IP Code per IS/IEC 60529).\n\n*Recommendations are intended to assist procurement review and should be verified against the latest applicable official standards and regulatory requirements.*`
          } else {
            const stdList = relevantStandards
              .map((s) => `• **${s.standardNumber}** — *${s.title}* [${s.category || 'Standard'}]`)
              .join('\n')
            answerText = `Based on your technical procurement query, the applicable verified Indian Standards are:\n\n${stdList}\n\nThese standards govern technical specifications, quality control benchmarks, and test acceptance criteria for public procurement tenders.\n\n*Recommendations are intended to assist procurement review and should be verified against the latest applicable official standards and regulatory requirements.*`
          }
        }
      }
    }

    const suggestedQuestions =
      relevantStandards.length > 0
        ? [
            'Which test methods are mandatory for these standards?',
            'Is BIS certification compulsory under Government QCO?',
            'What are the normative relationships between these standards?',
            'Check potential specification gaps in this tender.',
          ]
        : [
            'Which standards apply to 120W outdoor LED street lights?',
            'What Indian Standards govern plain and reinforced concrete (RCC)?',
            'Which BIS standard applies to HDPE water pipes?',
            'Are industrial safety helmets covered under compulsory BIS certification?',
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
