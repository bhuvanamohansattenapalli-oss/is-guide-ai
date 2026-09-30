import { NextRequest } from 'next/server'
import { DocumentExtractorService } from '@/lib/services/documents/document-extractor.service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const analysisId = formData.get('analysisId') as string | null

    if (!file) {
      return errorResponse('BAD_REQUEST', 'No file was provided in the upload request.', 400)
    }

    if (file.size > 10 * 1024 * 1024) {
      return errorResponse('BAD_REQUEST', 'File is too large. Maximum supported size is 10 MB.', 400)
    }

    if (file.size === 0) {
      return errorResponse('BAD_REQUEST', 'Document contains no extractable text.', 400)
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const result = await DocumentExtractorService.extractText(
      buffer,
      file.name,
      file.type
    )

    let documentRecord = null
    if (analysisId) {
      try {
        documentRecord = await prisma.procurementDocument.create({
          data: {
            analysisId,
            fileName: result.fileName,
            fileType: result.fileType,
            fileSize: result.fileSize,
            extractedText: result.text.slice(0, 50000), // store up to 50k chars
          },
        })
      } catch (dbErr) {
        console.warn('[Upload Route] Database save note:', dbErr)
      }
    }

    const payload = {
      document: documentRecord,
      fileName: result.fileName,
      fileType: result.fileType,
      fileSize: result.fileSize,
      pageCount: result.pageCount,
      extractedText: result.text,
      extractedLength: result.extractedLength,
      warnings: result.warnings,
    }

    return successResponse(
      {
        data: payload,
        ...payload,
      },
      200
    )
  } catch (error) {
    return handleApiError(error)
  }
}
