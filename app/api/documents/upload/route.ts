import { NextRequest } from 'next/server'
import { DocumentExtractorService } from '@/lib/services/documents/document-extractor.service'
import { successResponse, handleApiError } from '@/lib/utils/api-response'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const analysisId = formData.get('analysisId') as string | null

    if (!file) {
      return handleApiError(new Error('No file was provided in the upload request.'))
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
      documentRecord = await prisma.procurementDocument.create({
        data: {
          analysisId,
          fileName: result.fileName,
          fileType: result.fileType,
          fileSize: result.fileSize,
          extractedText: result.text.slice(0, 50000), // store up to 50k chars
        },
      })
    }

    return successResponse(
      {
        document: documentRecord,
        fileName: result.fileName,
        fileType: result.fileType,
        fileSize: result.fileSize,
        pageCount: result.pageCount,
        extractedText: result.text,
        extractedLength: result.extractedLength,
        warnings: result.warnings,
      },
      200
    )
  } catch (error) {
    return handleApiError(error)
  }
}
