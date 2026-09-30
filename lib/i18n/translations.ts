export type Language = 'en' | 'hi' | 'te'

export interface TranslationDictionary {
  // Navigation
  dashboard: string
  standardsFinder: string
  standards: string
  analyzer: string
  aiRecommendations: string
  comparison: string
  complianceQCO: string
  reports: string
  procurementReports: string
  analysisHistory: string
  aiCopilot: string
  profile: string
  signOut: string
  signIn: string
  signUp: string
  qcoRegistry: string

  // Analyzer
  analyze: string
  uploadDocument: string
  uploadPDF: string
  uploadDOCX: string
  dragDropTender: string
  serverSideExtractionNote: string
  pasteSpecification: string
  productDescription: string
  technicalSpecification: string
  startAnalysis: string
  specificationLanguage: string
  sampleTenders: string
  clearSpecification: string
  extractingDocument: string
  specTitleLabel: string
  specTextPlaceholder: string
  verifiedSourceNotice: string

  // Progress
  readingSpecification: string
  extractingRequirements: string
  findingRelevantStandards: string
  checkingRelatedStandards: string
  checkingVersionsAmendments: string
  checkingCertificationRequirements: string
  generatingReport: string

  // Results & Standards
  recommendedStandards: string
  systemRelevance: string
  whyRecommended: string
  matchedRequirements: string
  relatedStandards: string
  normativeReferences: string
  testMethods: string
  safetyStandards: string
  installationStandards: string
  currentVersion: string
  amendments: string
  certificationCompliance: string
  specificationGaps: string
  potentialSpecificationGap: string
  identifiedRequirements: string
  statusActive: string
  statusMandatory: string
  statusRecommended: string
  completenessScore: string
  scopeAndTitle: string
  mandatoryQCO: string

  // Buttons & Actions
  viewDetails: string
  generateReport: string
  downloadPDF: string
  improveSpecification: string
  tryAgain: string
  remove: string
  cancel: string
  save: string
  searchPlaceholder: string
  close: string
  print: string

  // Messages & Errors
  analysisCompleted: string
  noRelevantStandardsFound: string
  unableToProcessDocument: string
  fileTooLarge: string
  fileTooLarge10MB: string
  unsupportedFileType: string
  pleaseEnterSpecification: string
  pdfExtractError: string
  docxExtractError: string
  documentNoTextError: string
  emptyFileError: string
  analysisFailedError: string

  // Copilot Assistant
  copilotGreeting: string
  copilotInputPlaceholder: string
  copilotSend: string
  copilotThinking: string
}

export const TRANSLATIONS: Record<Language, TranslationDictionary> = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    standardsFinder: 'Standards Finder',
    standards: 'Standards',
    analyzer: 'Tender Analyzer',
    aiRecommendations: 'AI Recommendations',
    comparison: 'Standards Comparison',
    complianceQCO: 'Compliance & QCO',
    reports: 'Reports',
    procurementReports: 'Procurement Reports',
    analysisHistory: 'Analysis History',
    aiCopilot: 'AI Copilot',
    profile: 'Profile',
    signOut: 'Sign Out',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    qcoRegistry: 'QCO Registry',

    // Analyzer
    analyze: 'Analyze',
    uploadDocument: 'Upload Document',
    uploadPDF: 'Upload PDF',
    uploadDOCX: 'Upload DOCX',
    dragDropTender: 'Drag & drop tender PDF / DOCX here, or browse',
    serverSideExtractionNote: 'Server-side safe text extraction (up to 10MB)',
    pasteSpecification: 'Paste Specification',
    productDescription: 'Product Description',
    technicalSpecification: 'Technical Specification',
    startAnalysis: 'Start Analysis',
    specificationLanguage: 'Specification Language',
    sampleTenders: 'Sample Tenders',
    clearSpecification: 'Clear',
    extractingDocument: 'Extracting text from tender document...',
    specTitleLabel: 'Tender / Specification Title',
    specTextPlaceholder: 'Paste raw tender specification, scope of work, technical parameters, bill of quantities (BOQ), or clause details here...',
    verifiedSourceNotice: 'Recommendations are intended to assist procurement review and should be verified against the latest applicable official standards and regulatory requirements.',

    // Progress
    readingSpecification: 'Reading specification',
    extractingRequirements: 'Extracting requirements',
    findingRelevantStandards: 'Finding relevant standards',
    checkingRelatedStandards: 'Checking related standards',
    checkingVersionsAmendments: 'Checking versions and amendments',
    checkingCertificationRequirements: 'Checking certification requirements',
    generatingReport: 'Generating report',

    // Results & Standards
    recommendedStandards: 'Recommended Standards',
    systemRelevance: 'System Relevance',
    whyRecommended: 'Why Recommended',
    matchedRequirements: 'Matched Requirements',
    relatedStandards: 'Related Standards',
    normativeReferences: 'Normative References',
    testMethods: 'Test Methods',
    safetyStandards: 'Safety Standards',
    installationStandards: 'Installation Standards',
    currentVersion: 'Current Version',
    amendments: 'Amendments',
    certificationCompliance: 'Certification / Compliance',
    specificationGaps: 'Specification Gaps',
    potentialSpecificationGap: 'Potential Specification Gap',
    identifiedRequirements: 'Extracted Technical Requirements',
    statusActive: 'Active',
    statusMandatory: 'Mandatory QCO',
    statusRecommended: 'Recommended',
    completenessScore: 'Specification Completeness',
    scopeAndTitle: 'Scope & Title',
    mandatoryQCO: 'Mandatory BIS Quality Control Order',

    // Buttons & Actions
    viewDetails: 'View Details',
    generateReport: 'Generate Report',
    downloadPDF: 'Download PDF',
    improveSpecification: 'Improve Specification',
    tryAgain: 'Try Again',
    remove: 'Remove',
    cancel: 'Cancel',
    save: 'Save',
    searchPlaceholder: 'Search Indian Standards by number, keyword, or product (e.g., IS 456, LED, Solar, HDPE)...',
    close: 'Close',
    print: 'Print Report',

    // Messages & Errors
    analysisCompleted: 'Analysis completed',
    noRelevantStandardsFound: 'No sufficiently relevant standards found in the verified catalog. Please verify with authoritative sources.',
    unableToProcessDocument: 'Unable to process document',
    fileTooLarge: 'File too large',
    fileTooLarge10MB: 'File is too large. Maximum supported size is 10 MB.',
    unsupportedFileType: 'Unsupported file type. Please upload a PDF (.pdf), Microsoft Word (.docx), or Text (.txt) file.',
    pleaseEnterSpecification: 'Please enter a specification',
    pdfExtractError: 'Unable to extract text from this PDF. Please verify that the file is readable.',
    docxExtractError: 'Unable to process this DOCX document.',
    documentNoTextError: 'Document contains no extractable text.',
    emptyFileError: 'Document contains no extractable text. The uploaded file is empty.',
    analysisFailedError: 'Analysis server returned an error. Please retry.',

    // Copilot Assistant
    copilotGreeting: 'Namaste! I am the IS-Guide AI Procurement Intelligence Assistant. Ask any question about Indian Standards, mandatory test procedures, or statutory QCO certification.',
    copilotInputPlaceholder: 'Ask about Indian Standards, QCOs, test methods, or tender clauses...',
    copilotSend: 'Send Query',
    copilotThinking: 'Evaluating against verified BIS standards catalog...',
  },

  hi: {
    // Navigation
    dashboard: 'डैशबोर्ड',
    standardsFinder: 'मानक खोजक',
    standards: 'मानक',
    analyzer: 'निविदा विश्लेषक',
    aiRecommendations: 'एआई सिफारिशें',
    comparison: 'मानकों की तुलना',
    complianceQCO: 'अनुपालन और क्यूसीओ',
    reports: 'रिपोर्ट्स',
    procurementReports: 'खरीद रिपोर्ट',
    analysisHistory: 'विश्लेषण इतिहास',
    aiCopilot: 'एआई कोपायलट',
    profile: 'प्रोफ़ाइल',
    signOut: 'साइन आउट',
    signIn: 'साइन इन',
    signUp: 'साइन अप',
    qcoRegistry: 'क्यूसीओ रजिस्ट्री',

    // Analyzer
    analyze: 'विश्लेषण करें',
    uploadDocument: 'दस्तावेज़ अपलोड करें',
    uploadPDF: 'पीडीएफ अपलोड करें',
    uploadDOCX: 'DOCX अपलोड करें',
    dragDropTender: 'निविदा पीडीएफ / डीओसीएक्स यहां खींचें और छोड़ें, या ब्राउज़ करें',
    serverSideExtractionNote: 'सर्वर-साइड सुरक्षित पाठ निष्कर्षण (10MB तक)',
    pasteSpecification: 'विनिर्देश पेस्ट करें',
    productDescription: 'उत्पाद विवरण',
    technicalSpecification: 'तकनीकी विनिर्देश',
    startAnalysis: 'विश्लेषण शुरू करें',
    specificationLanguage: 'विनिर्देश भाषा',
    sampleTenders: 'नमूना निविदाएं',
    clearSpecification: 'साफ़ करें',
    extractingDocument: 'निविदा दस्तावेज़ से पाठ निकाला जा रहा है...',
    specTitleLabel: 'निविदा / विनिर्देश शीर्षक',
    specTextPlaceholder: 'कच्चे निविदा विनिर्देश, कार्यक्षेत्र, तकनीकी मापदंड या खंड विवरण यहां पेस्ट करें...',
    verifiedSourceNotice: 'सिफारिशें केवल खरीद समीक्षा में सहायता के लिए हैं और इन्हें आधिकारिक मानकों एवं वैधानिक आवश्यकताओं के अनुसार सत्यापित किया जाना चाहिए।',

    // Progress
    readingSpecification: 'विनिर्देश पढ़ रहे हैं',
    extractingRequirements: 'आवश्यकताएं निकाली जा रही हैं',
    findingRelevantStandards: 'प्रासंगिक मानक ढूंढे जा रहे हैं',
    checkingRelatedStandards: 'संबंधित मानकों की जांच की जा रही है',
    checkingVersionsAmendments: 'संस्करणों और संशोधनों की जांच की जा रही है',
    checkingCertificationRequirements: 'प्रमाणन आवश्यकताओं की जांच की जा रही है',
    generatingReport: 'रिपोर्ट तैयार की जा रही है',

    // Results & Standards
    recommendedStandards: 'अनुशंसित मानक',
    systemRelevance: 'सिस्टम प्रासंगिकता',
    whyRecommended: 'सिफारिश का कारण',
    matchedRequirements: 'मेल खाने वाली आवश्यकताएं',
    relatedStandards: 'संबंधित मानक',
    normativeReferences: 'मानक संदर्भ',
    testMethods: 'परीक्षण विधियां',
    safetyStandards: 'सुरक्षा मानक',
    installationStandards: 'स्थापना मानक',
    currentVersion: 'वर्तमान संस्करण',
    amendments: 'संशोधन',
    certificationCompliance: 'प्रमाणन / अनुपालन',
    specificationGaps: 'विनिर्देश में कमियां',
    potentialSpecificationGap: 'संभावित विनिर्देश अंतर',
    identifiedRequirements: 'पहचानी गई तकनीकी आवश्यकताएं',
    statusActive: 'सक्रिय',
    statusMandatory: 'अनिवार्य क्यूसीओ',
    statusRecommended: 'अनुशंसित',
    completenessScore: 'विनिर्देश पूर्णता',
    scopeAndTitle: 'दायरा और शीर्षक',
    mandatoryQCO: 'अनिवार्य बीआईएस गुणवत्ता नियंत्रण आदेश (QCO)',

    // Buttons & Actions
    viewDetails: 'विवरण देखें',
    generateReport: 'रिपोर्ट तैयार करें',
    downloadPDF: 'पीडीएफ डाउनलोड करें',
    improveSpecification: 'विनिर्देश में सुधार करें',
    tryAgain: 'पुनः प्रयास करें',
    remove: 'हटाएं',
    cancel: 'रद्द करें',
    save: 'सहेजें',
    searchPlaceholder: 'संख्या, कीवर्ड या उत्पाद द्वारा भारतीय मानक खोजें (उदा. IS 456, LED, Solar, HDPE)...',
    close: 'बंद करें',
    print: 'रिपोर्ट प्रिंट करें',

    // Messages & Errors
    analysisCompleted: 'विश्लेषण पूरा हुआ',
    noRelevantStandardsFound: 'सत्यापित कैटलॉग में कोई पर्याप्त प्रासंगिक मानक नहीं मिला। कृपया आधिकारिक स्रोतों से पुष्टि करें।',
    unableToProcessDocument: 'दस्तावेज़ को संसाधित करने में असमर्थ',
    fileTooLarge: 'फ़ाइल बहुत बड़ी है',
    fileTooLarge10MB: 'फ़ाइल बहुत बड़ी है। अधिकतम समर्थित आकार 10 MB है।',
    unsupportedFileType: 'असमर्थित फ़ाइल प्रकार। कृपया पीडीएफ (.pdf), वर्ड (.docx), या टेक्स्ट (.txt) फ़ाइल अपलोड करें।',
    pleaseEnterSpecification: 'कृपया एक विनिर्देश दर्ज करें',
    pdfExtractError: 'इस पीडीएफ से पाठ निकालने में असमर्थ। कृपया सत्यापित करें कि फ़ाइल पठनीय है।',
    docxExtractError: 'इस DOCX दस्तावेज़ को संसाधित करने में असमर्थ।',
    documentNoTextError: 'दस्तावेज़ में कोई निकालने योग्य पाठ नहीं है।',
    emptyFileError: 'दस्तावेज़ में कोई निकालने योग्य पाठ नहीं है। अपलोड की गई फ़ाइल खाली है।',
    analysisFailedError: 'विश्लेषण सर्वर ने त्रुटि लौटाई। कृपया पुनः प्रयास करें।',

    // Copilot Assistant
    copilotGreeting: 'नमस्ते! मैं IS-Guide AI खरीद खुफिया सहायक हूँ। भारतीय मानकों, परीक्षण प्रक्रियाओं या वैधानिक QCO प्रमाणन के बारे में कोई भी प्रश्न पूछें।',
    copilotInputPlaceholder: 'भारतीय मानकों, QCO, परीक्षण विधियों या निविदा शर्तों के बारे में पूछें...',
    copilotSend: 'भेजें',
    copilotThinking: 'सत्यापित बीआईएस मानक कैटलॉग के आधार पर मूल्यांकन कर रहा है...',
  },

  te: {
    // Navigation
    dashboard: 'డ్యాష్‌బోర్డ్',
    standardsFinder: 'ప్రమాణాల శోధన',
    standards: 'ప్రమాణాలు',
    analyzer: 'టెండర్ విశ్లేషకుడు',
    aiRecommendations: 'AI సిఫార్సులు',
    comparison: 'ప్రమాణాల పోలిక',
    complianceQCO: 'నిబంధనలు & QCO',
    reports: 'నివేదికలు',
    procurementReports: 'ప్రొక్యూర్మెంట్ నివేదికలు',
    analysisHistory: 'విశ్లేషణ చరిత్ర',
    aiCopilot: 'AI కోపైలట్',
    profile: 'ప్రొఫైల్',
    signOut: 'సైన్ అవుట్',
    signIn: 'సైన్ ఇన్',
    signUp: 'సైన్ అప్',
    qcoRegistry: 'QCO రిజిస్ట్రీ',

    // Analyzer
    analyze: 'విశ్లేషించండి',
    uploadDocument: 'పత్రాన్ని అప్లోడ్ చేయండి',
    uploadPDF: 'PDF అప్‌లోడ్ చేయండి',
    uploadDOCX: 'DOCX అప్‌లోడ్ చేయండి',
    dragDropTender: 'టెండర్ PDF / DOCX ఇక్కడ డ్రాగ్ & డ్రాప్ చేయండి, లేదా బ్రౌజ్ చేయండి',
    serverSideExtractionNote: 'సర్వర్-సైడ్ సురక్షిత వచన సంగ్రహణ (గరిష్టంగా 10MB వరకు)',
    pasteSpecification: 'స్పెసిఫికేషన్ పేస్ట్ చేయండి',
    productDescription: 'ఉత్పత్తి వివరణ',
    technicalSpecification: 'సాంకేతిక వివరాలు',
    startAnalysis: 'విశ్లేషణ ప్రారంభించండి',
    specificationLanguage: 'స్పెసిఫికేషన్ భాష',
    sampleTenders: 'నమూనా టెండర్లు',
    clearSpecification: 'క్లియర్ చేయి',
    extractingDocument: 'టెండర్ పత్రం నుండి వచనాన్ని సంగ్రహిస్తోంది...',
    specTitleLabel: 'టెండర్ / స్పెసిఫికేషన్ శీర్షిక',
    specTextPlaceholder: 'టెండర్ స్పెసిఫికేషన్, పని పరిధి, సాంకేతిక పారామితులు లేదా క్లాజ్ వివరాలను ఇక్కడ పేస్ట్ చేయండి...',
    verifiedSourceNotice: 'సిఫార్సులు కొనుగోలు సమీక్షకు సహాయపడటానికి మాత్రమే ఉద్దేశించబడ్డాయి మరియు అధికారిక ప్రమాణాలు మరియు చట్టబద్ధమైన అవసరాలకు అనుగుణంగా ధృవీకరించబడాలి.',

    // Progress
    readingSpecification: 'స్పెసిఫికేషన్ చదువుతోంది',
    extractingRequirements: 'అవసరాలను సంగ్రహిస్తోంది',
    findingRelevantStandards: 'సంబంధిత ప్రమాణాలను కనుగొంటోంది',
    checkingRelatedStandards: 'సంబంధిత ప్రమాణాలను తనిఖీ చేస్తోంది',
    checkingVersionsAmendments: 'వెర్షన్లు మరియు సవరణలను తనిఖీ చేస్తోంది',
    checkingCertificationRequirements: 'ధృవీకరణ అవసరాలను తనిఖీ చేస్తోంది',
    generatingReport: 'నివేదిక రూపొందిస్తోంది',

    // Results & Standards
    recommendedStandards: 'సిఫార్సు చేయబడిన ప్రమాణాలు',
    systemRelevance: 'సిస్టమ్ ఔచిత్యం',
    whyRecommended: 'ఎందుకు సిఫార్సు చేయబడింది',
    matchedRequirements: 'సరిపోలిన అవసరాలు',
    relatedStandards: 'సంబంధిత ప్రమాణాలు',
    normativeReferences: 'ప్రామాణిక సూచనలు',
    testMethods: 'పరీక్షా పద్ధతులు',
    safetyStandards: 'భద్రతా ప్రమాణాలు',
    installationStandards: 'ఇన్‌స్టాలేషన్ ప్రమాణాలు',
    currentVersion: 'ప్రస్తుత వెర్షన్',
    amendments: 'సవరణలు',
    certificationCompliance: 'ధృవీకరణ / సమ్మతి',
    specificationGaps: 'స్పెసిఫికేషన్ లోపాలు',
    potentialSpecificationGap: 'సంభావ్య స్పెసిఫికేషన్ లోపం',
    identifiedRequirements: 'సంగ్రహించిన సాంకేతిక అవసరాలు',
    statusActive: 'క్రియాశీలం',
    statusMandatory: 'తప్పనిసరి QCO',
    statusRecommended: 'సిఫార్సు చేయబడింది',
    completenessScore: 'స్పెసిఫికేషన్ సంపూర్ణత',
    scopeAndTitle: 'పరిధి & శీర్షిక',
    mandatoryQCO: 'తప్పనిసరి BIS క్వాలిటీ కంట్రోల్ ఆర్డర్ (QCO)',

    // Buttons & Actions
    viewDetails: 'వివరాలను వీక్షించండి',
    generateReport: 'నివేదికను రూపొందించండి',
    downloadPDF: 'PDF డౌన్‌లోడ్ చేయండి',
    improveSpecification: 'స్పెసిఫికేషన్‌ను మెరుగుపరచండి',
    tryAgain: 'మళ్ళీ ప్రయత్నించండి',
    remove: 'తొలగించు',
    cancel: 'రద్దు చేయి',
    save: 'సేవ్ చేయి',
    searchPlaceholder: 'భారతీయ ప్రమాణాలను నంబర్, కీవర్డ్ లేదా ఉత్పత్తి ద్వారా వెతకండి (ఉదా: IS 456, LED, Solar, HDPE)...',
    close: 'మూసివేయి',
    print: 'ప్రింట్ నివేదిక',

    // Messages & Errors
    analysisCompleted: 'విశ్లేషణ పూర్తయింది',
    noRelevantStandardsFound: 'ధృవీకరించబడిన కేటలాగ్‌లో తగినంత సంబంధిత ప్రమాణాలు కనుగొనబడలేదు. దయచేసి అధికారిక వనరులతో నిర్ధారించండి.',
    unableToProcessDocument: 'పత్రాన్ని ప్రాసెస్ చేయడం సాధ్యం కాలేదు',
    fileTooLarge: 'ఫైల్ పరిమాణం చాలా పెద్దదిగా ఉంది',
    fileTooLarge10MB: 'ఫైల్ చాలా పెద్దదిగా ఉంది. గరిష్టంగా 10 MB పరిమాణం మాత్రమే అనుమతించబడుతుంది.',
    unsupportedFileType: 'మద్దతు లేని ఫైల్ రకం. దయచేసి PDF (.pdf), Word (.docx) లేదా Text (.txt) ఫైల్‌ను అప్‌లోడ్ చేయండి.',
    pleaseEnterSpecification: 'దయచేసి ఒక స్పెసిఫికేషన్‌ను నమోదు చేయండి',
    pdfExtractError: 'ఈ PDF నుండి వచనాన్ని సంగ్రహించడం సాధ్యం కాలేదు. ఫైల్ చదవదగినదా అని దయచేసి ధృవీకరించండి.',
    docxExtractError: 'ఈ DOCX పత్రాన్ని ప్రాసెస్ చేయడం సాధ్యం కాలేదు.',
    documentNoTextError: 'పత్రంలో సంగ్రహించదగిన వచనం ఏదీ లేదు.',
    emptyFileError: 'పత్రంలో సంగ్రహించదగిన వచనం ఏదీ లేదు. అప్‌లోడ్ చేసిన ఫైల్ ఖాళీగా ఉంది.',
    analysisFailedError: 'విశ్లేషణ సర్వర్ లోపం చూపింది. దయచేసి మళ్ళీ ప్రయత్నించండి.',

    // Copilot Assistant
    copilotGreeting: 'నమస్కారం! నేను IS-Guide AI ప్రొక్యూర్మెంట్ ఇంటెలిజెన్స్ అసిస్టెంట్‌ని. భారతీయ ప్రమాణాలు, పరీక్షా విధానాలు లేదా QCO సర్టిఫికేషన్ గురించి ఏదైనా అడగండి.',
    copilotInputPlaceholder: 'భారతీయ ప్రమాణాలు, QCOలు, పరీక్షా పద్ధతులు లేదా టెండర్ నిబంధనల గురించి అడగండి...',
    copilotSend: 'పంపండి',
    copilotThinking: 'ధృవీకరించబడిన BIS ప్రమాణాల కేటలాగ్ ద్వారా మూల్యాంకనం చేస్తోంది...',
  },
}
