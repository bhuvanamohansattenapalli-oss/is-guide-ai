import mammoth from 'mammoth'
import { AppError } from '@/lib/utils/api-response'

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
      throw new AppError('File is too large. Maximum supported size is 10 MB.', 'BAD_REQUEST', 400)
    }

    if (fileSize === 0) {
      throw new AppError('Document contains no extractable text.', 'BAD_REQUEST', 400)
    }

    let extractedText = ''
    let detectedType = mimeType || 'text/plain'
    let pageCount: number | undefined

    if (ext === 'pdf' || mimeType === 'application/pdf') {
      detectedType = 'application/pdf'
      try {
        const pdfParseModule: any = await import('pdf-parse')

        if (pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse) {
          const PDFClass = pdfParseModule.PDFParse || pdfParseModule.default.PDFParse

          // Explicitly set worker for Next.js / Node.js runtime
          try {
            const { pathToFileURL } = await import('node:url')
            const path = await import('node:path')
            const fs = await import('node:fs')

            const workerCandidates = [
              path.resolve(process.cwd(), 'node_modules/pdf-parse/dist/worker/pdf.worker.mjs'),
              path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'),
            ]
            for (const workerPath of workerCandidates) {
              if (fs.existsSync(workerPath)) {
                PDFClass.setWorker(pathToFileURL(workerPath).href)
                break
              }
            }
          } catch (workerErr) {
            console.warn('[DocumentExtractorService] Worker path note:', workerErr)
          }

          const parser = new PDFClass({ data: buffer })
          if (typeof parser.load === 'function') {
            await parser.load()
          }
          const res = await parser.getText()
          extractedText = typeof res === 'string' ? res : (res?.text || '')
          pageCount = res?.total || res?.pages?.length
          if (typeof parser.destroy === 'function') {
            await parser.destroy()
          }
        } else if (typeof pdfParseModule === 'function' || typeof pdfParseModule.default === 'function') {
          const fn = typeof pdfParseModule === 'function' ? pdfParseModule : pdfParseModule.default
          const pdfData = await fn(buffer)
          extractedText = pdfData?.text || ''
          pageCount = pdfData?.numpages
        } else {
          throw new Error('PDF parsing module could not be initialized.')
        }
      } catch (err: any) {
        console.error('[DocumentExtractorService] PDF extraction error:', err?.message || err)
        throw new AppError('Unable to extract text from this PDF. Please verify that the file is readable.', 'BAD_REQUEST', 400)
      }
    } else if (
      ext === 'docx' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      detectedType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      try {
        const mammothModule: any = await import('mammoth')
        const extractFn = mammothModule.extractRawText || mammothModule.default?.extractRawText || mammoth.extractRawText
        if (!extractFn) {
          throw new Error('Mammoth extractRawText function not available.')
        }
        const result = await extractFn({ buffer })
        extractedText = result.value || ''
        if (result.messages && result.messages.length > 0) {
          warnings.push(...result.messages.map((m: any) => m.message))
        }
      } catch (err: any) {
        console.error('[DocumentExtractorService] DOCX extraction error:', err?.message || err)
        throw new AppError('Unable to process this DOCX document.', 'BAD_REQUEST', 400)
      }
    } else if (ext === 'txt' || mimeType?.startsWith('text/')) {
      detectedType = 'text/plain'
      extractedText = buffer.toString('utf-8')
    } else {
      throw new AppError('Unsupported file type.', 'BAD_REQUEST', 400)
    }

    // Clean whitespace and normalize line breaks
    const cleanText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[ \u00A0]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    if (!cleanText || cleanText.length === 0) {
      throw new AppError('Document contains no extractable text.', 'BAD_REQUEST', 400)
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
