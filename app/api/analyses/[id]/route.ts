import { NextRequest } from 'next/server'
import { AnalysisService } from '@/lib/services/analysis/analysis.service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Retrieve a full procurement analysis by ID
 * GET /api/analyses/[id]
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    if (!id || typeof id !== 'string') {
      return errorResponse('BAD_REQUEST', 'Analysis ID parameter is required', 400)
    }

    const analysis = await AnalysisService.getAnalysisById(id)

    if (!analysis) {
      return errorResponse('NOT_FOUND', `Analysis with ID "${id}" not found`, 404)
    }

    return successResponse({ analysis }, 200)
  } catch (error) {
    return handleApiError(error)
  }
}
