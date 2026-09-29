import { prisma } from '@/lib/prisma'
import { StandardsQueryInput, SearchStandardsQueryInput } from '@/lib/validations/standards'
import { Prisma, StandardStatus } from '@prisma/client'

/**
 * Service handling Indian Standards catalog queries
 */
export class StandardsService {
  /**
   * Retrieve paginated standards with filtering
   */
  static async getStandards(query: StandardsQueryInput) {
    const { page, limit, search, category, status } = query
    const skip = (page - 1) * limit

    const where: Prisma.StandardWhereInput = {}

    if (category) {
      where.category = {
        equals: category,
        mode: 'insensitive',
      }
    }

    if (status) {
      where.status = status as StandardStatus
    }

    if (search) {
      where.OR = [
        { standardNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { shortTitle: { contains: search, mode: 'insensitive' } },
      ]
    }

    try {
      const [standards, total] = await Promise.all([
        prisma.standard.findMany({
          where,
          skip,
          take: limit,
          orderBy: { standardNumber: 'asc' },
          include: {
            versions: {
              where: { status: 'CURRENT' },
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
        }),
        prisma.standard.count({ where }),
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        data: standards,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      }
    } catch (error) {
      // If database is empty or not yet connected, return empty response gracefully
      console.warn('[StandardsService.getStandards] Database query fallback:', error)
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
   * Retrieve a single standard by ID or standardNumber with full relationships
   */
  static async getStandardById(id: string) {
    try {
      const standard = await prisma.standard.findFirst({
        where: {
          OR: [{ id }, { standardNumber: id }],
        },
        include: {
          versions: {
            orderBy: { publicationDate: 'desc' },
          },
          amendments: {
            orderBy: { publicationDate: 'desc' },
          },
          outgoingRelationships: {
            include: {
              targetStandard: {
                select: {
                  id: true,
                  standardNumber: true,
                  title: true,
                  status: true,
                  category: true,
                },
              },
            },
          },
          incomingRelationships: {
            include: {
              sourceStandard: {
                select: {
                  id: true,
                  standardNumber: true,
                  title: true,
                  status: true,
                  category: true,
                },
              },
            },
          },
        },
      })

      return standard
    } catch (error) {
      console.warn('[StandardsService.getStandardById] Database query fallback:', error)
      return null
    }
  }

  /**
   * Keyword / Lexical database search across standard fields
   */
  static async searchStandards(query: SearchStandardsQueryInput) {
    const { search, page, limit } = query
    const skip = (page - 1) * limit

    const where: Prisma.StandardWhereInput = {
      OR: [
        { standardNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { shortTitle: { contains: search, mode: 'insensitive' } },
        { scope: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ],
    }

    try {
      const [standards, total] = await Promise.all([
        prisma.standard.findMany({
          where,
          skip,
          take: limit,
          orderBy: { standardNumber: 'asc' },
          include: {
            versions: {
              where: { status: 'CURRENT' },
              take: 1,
            },
          },
        }),
        prisma.standard.count({ where }),
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        data: standards,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      }
    } catch (error) {
      console.warn('[StandardsService.searchStandards] Database search fallback:', error)
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
}
