import { NextRequest } from 'next/server'
import { RecommendationsService } from '@/lib/services/recommendations/recommendations.service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

/**
 * Retrieve recommendations for an analysis via query parameter
 * GET /api/recommendations?analysisId=...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const analysisId = searchParams.get('analysisId')

    if (!analysisId) {
      return errorResponse('BAD_REQUEST', 'Query parameter "analysisId" is required', 400)
    }

    const recommendations = await RecommendationsService.getRecommendationsByAnalysisId(analysisId)

    return successResponse({
      analysisId,
      recommendations,
      count: recommendations.length,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
