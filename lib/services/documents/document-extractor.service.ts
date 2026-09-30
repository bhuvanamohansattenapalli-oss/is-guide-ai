import mammoth from 'mammoth'

export interface ExtractedDocumentResult {
  text: string
  fileName: string
  fileType: string
  fileSize: number
  pageCount?: number
  extractedLength: number
  warnings?: string[]
}

/**
 * Safe server-side document text extractor supporting PDF, DOCX, and TXT files.
 */
export class DocumentExtractorService {
  /**
   * Extract plain text from an uploaded file Buffer
   */
  static async extractText(
    buffer: Buffer,
    fileName: string,
    mimeType?: string
  ): Promise<ExtractedDocumentResult> {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    const fileSize = buffer.length
    const warnings: string[] = []

    // Maximum file size check (10 MB)
    const MAX_SIZE = 10 * 1024 * 1024
    if (fileSize > MAX_SIZE) {
      throw new Error(`File exceeds maximum allowed size of 10MB (${(fileSize / (1024 * 1024)).toFixed(1)}MB provided).`)
    }

    if (fileSize === 0) {
      throw new Error('The uploaded file is empty (0 bytes).')
    }

    let extractedText = ''
    let detectedType = mimeType || 'text/plain'
    let pageCount: number | undefined

    if (ext === 'pdf' || mimeType === 'application/pdf') {
      detectedType = 'application/pdf'
      try {
        const pdfParseModule: any = await import('pdf-parse')
        const pdfParse = (pdfParseModule.default || pdfParseModule) as (dataBuffer: Buffer) => Promise<{ text: string; numpages: number }>
        const pdfData = await pdfParse(buffer)
        extractedText = pdfData.text || ''
        pageCount = pdfData.numpages
      } catch (err: any) {
        console.warn('[DocumentExtractorService] pdf-parse direct extraction note:', err.message)
        // Fallback: extract printable text streams from PDF buffer if standard parser errors
        const ascii = buffer.toString('latin1')
        const streamMatches = ascii.match(/\(([^()]{3,})\)[\s]*Tj/g) || []
        const fallbackText = streamMatches
          .map((m) => m.replace(/^\(|\)[\s]*Tj$/g, ''))
          .filter((t) => t.length > 2)
          .join(' ')
        if (fallbackText.length > 100) {
          extractedText = fallbackText
          warnings.push('Extracted using PDF text-stream fallback.')
        } else {
          throw new Error('Unable to extract readable text from PDF. The document may be password-protected or contain scanned images without OCR text.')
        }
      }
    } else if (
      ext === 'docx' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      detectedType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      try {
        const result = await mammoth.extractRawText({ buffer })
        extractedText = result.value || ''
        if (result.messages && result.messages.length > 0) {
          warnings.push(...result.messages.map((m) => m.message))
        }
      } catch (err: any) {
        throw new Error(`Failed to extract text from DOCX file: ${err.message}`)
      }
    } else if (ext === 'txt' || mimeType?.startsWith('text/')) {
      detectedType = 'text/plain'
      extractedText = buffer.toString('utf-8')
    } else {
      throw new Error(`Unsupported document format '.${ext}'. Please upload a PDF (.pdf), Microsoft Word (.docx), or Text (.txt) file.`)
    }

    // Clean whitespace and normalize line breaks
    const cleanText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[ \u00A0]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (!cleanText || cleanText.length < 15) {
      throw new Error('The document does not contain sufficient text for procurement specification analysis.')
    }

    return {
      text: cleanText,
      fileName,
      fileType: detectedType,
      fileSize,
      pageCount,
      extractedLength: cleanText.length,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }
}
