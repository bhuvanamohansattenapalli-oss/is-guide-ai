import { prisma } from '@/lib/prisma'

/**
 * Service managing recommendations associated with a procurement analysis
 */
export class RecommendationsService {
  /**
   * Retrieve recommendations stored for an analysis
   */
  static async getRecommendationsByAnalysisId(analysisId: string) {
    try {
      const recommendations = await prisma.recommendation.findMany({
        where: { analysisId },
        orderBy: { rank: 'asc' },
        include: {
          standard: {
            select: {
              id: true,
              standardNumber: true,
              title: true,
              shortTitle: true,
              category: true,
              status: true,
              scope: true,
            },
          },
          evidence: {
            include: {
              requirement: {
                select: {
                  id: true,
                  category: true,
                  name: true,
                  value: true,
                  unit: true,
                },
              },
            },
          },
        },
      })

      return recommendations
    } catch (error) {
      console.warn('[RecommendationsService.getRecommendationsByAnalysisId] Fallback error:', error)
      return []
    }
  }
}
