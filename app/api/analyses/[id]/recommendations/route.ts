import { NextRequest } from 'next/server'
import { RecommendationsService } from '@/lib/services/recommendations/recommendations.service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Retrieve recommendations stored for an analysis
 * GET /api/analyses/[id]/recommendations
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

    const recommendations = await RecommendationsService.getRecommendationsByAnalysisId(id)

    return successResponse({
      analysisId: id,
      recommendations,
      count: recommendations.length,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
