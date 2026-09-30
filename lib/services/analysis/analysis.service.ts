import { prisma } from '@/lib/prisma'
import { CreateAnalysisInput, AnalysisQueryInput } from '@/lib/validations/analysis'
import { InputType, AnalysisStatus } from '@prisma/client'
import { RecommendationService, RecommendationResult } from '@/lib/services/recommendations/recommendation.service'

// In-memory cache for development/testing when PostgreSQL is offline or unconfigured
export const devAnalysisStore = new Map<string, any>()

/**
 * Service managing Procurement Analysis workflows
 */
export class AnalysisService {
  /**
   * Create a new procurement specification analysis record and execute full recommendation pipeline
   */
  static async createAnalysis(input: CreateAnalysisInput, userId?: string) {
    let analysis: any = null
    try {
      analysis = await Promise.race([
        prisma.procurementAnalysis.create({
          data: {
            title: input.title,
            inputType: (input.inputType || 'TEXT') as InputType,
            rawInput: input.rawInput,
            language: input.language || 'en',
            status: AnalysisStatus.PENDING,
            userId: userId || null,
            ...(input.fileName
              ? {
                  documents: {
                    create: {
                      fileName: input.fileName,
                      fileType: input.fileType || 'application/octet-stream',
                      fileSize: input.fileSize || null,
                      extractedText: input.rawInput.slice(0, 50000),
                    },
                  },
                }
              : {}),
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Prisma create analysis timeout')), 3000)
        ),
      ])
    } catch (error) {
      console.warn('[AnalysisService] Database insert failed, using in-memory store:', (error as Error).message)
      const fallbackId = `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      analysis = {
        id: fallbackId,
        title: input.title,
        inputType: (input.inputType || 'TEXT') as InputType,
        rawInput: input.rawInput,
        language: input.language || 'en',
        status: AnalysisStatus.PENDING,
        userId: userId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      devAnalysisStore.set(fallbackId, analysis)
    }

    // Run recommendation pipeline
    let pipelineResult: RecommendationResult | null = null
    try {
      pipelineResult = await RecommendationService.processAnalysis(analysis.id)
    } catch (err) {
      console.error('[AnalysisService] Recommendation pipeline error:', err)
    }

    // Return unified analysis response
    const finalResponse = {
      ...analysis,
      status: pipelineResult ? AnalysisStatus.COMPLETED : AnalysisStatus.PENDING,
      requirements: pipelineResult?.requirements || [],
      recommendations: pipelineResult?.recommendations || [],
      certifications: pipelineResult?.certifications || [],
      warnings: pipelineResult?.warnings || [],
      report: pipelineResult?.report || null,
    }

    if (devAnalysisStore.has(analysis.id)) {
      devAnalysisStore.set(analysis.id, finalResponse)
    }

    return finalResponse
  }

  /**
   * Retrieve paginated analyses
   */
  static async getAnalyses(query: AnalysisQueryInput, userId?: string) {
    const { page, limit, status } = query
    const skip = (page - 1) * limit

    const where = {
      ...(status && { status: status as AnalysisStatus }),
      ...(userId && { userId }),
    }

    try {
      const [analyses, total] = await Promise.all([
        prisma.procurementAnalysis.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            inputType: true,
            status: true,
            language: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                documents: true,
                requirements: true,
                recommendations: true,
              },
            },
          },
        }),
        prisma.procurementAnalysis.count({ where }),
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        data: analyses,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      }
    } catch (error) {
      console.warn('[AnalysisService.getAnalyses] Fallback error:', (error as Error).message)
      if (process.env.NODE_ENV !== 'production' && devAnalysisStore.size > 0) {
        const devItems = Array.from(devAnalysisStore.values())
        return {
          data: devItems,
          pagination: {
            page,
            limit,
            total: devItems.length,
            totalPages: Math.ceil(devItems.length / limit),
          },
        }
      }
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      }
    }
  }

  /**
   * Retrieve a detailed analysis by ID with all related entities
   */
  static async getAnalysisById(id: string) {
    try {
      const analysis = await prisma.procurementAnalysis.findUnique({
        where: { id },
        include: {
          documents: true,
          requirements: {
            orderBy: { createdAt: 'asc' },
          },
          recommendations: {
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
                  sourceUrl: true,
                  versions: {
                    orderBy: { publicationDate: 'desc' },
                  },
                  amendments: {
                    orderBy: { amendmentNumber: 'asc' },
                  },
                  outgoingRelationships: {
                    include: {
                      targetStandard: {
                        select: {
                          standardNumber: true,
                          title: true,
                        },
                      },
                    },
                  },
                },
              },
              evidence: {
                include: {
                  requirement: true,
                },
              },
            },
          },
          certifications: {
            include: {
              certificationRequirement: true,
            },
          },
          reports: {
            orderBy: { createdAt: 'desc' },
          },
        },
      })

      if (!analysis && devAnalysisStore.has(id)) {
        return devAnalysisStore.get(id)
      }

      return analysis
    } catch (error) {
      console.warn('[AnalysisService.getAnalysisById] Fallback error:', (error as Error).message)
      if (devAnalysisStore.has(id)) {
        return devAnalysisStore.get(id)
      }
      return null
    }
  }
}
