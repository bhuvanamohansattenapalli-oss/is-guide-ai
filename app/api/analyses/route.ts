import { NextRequest } from 'next/server'
import { AnalysisService } from '@/lib/services/analysis/analysis.service'
import { createAnalysisSchema, analysisQuerySchema } from '@/lib/validations/analysis'
import { successResponse, paginatedResponse, handleApiError } from '@/lib/utils/api-response'

/**
 * List paginated procurement analyses
 * GET /api/analyses?page=1&limit=20&status=...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const rawParams = {
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    }

    const validatedQuery = analysisQuerySchema.parse(rawParams)
    const result = await AnalysisService.getAnalyses(validatedQuery)

    return paginatedResponse(result.data, result.pagination)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * Create a new procurement specification analysis record
 * POST /api/analyses
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createAnalysisSchema.parse(body)

    const analysis = await AnalysisService.createAnalysis(validatedData)

    return successResponse({ analysis }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
