import { prisma } from '@/lib/prisma'
import { StandardsQueryInput, SearchStandardsQueryInput } from '@/lib/validations/standards'
import { Prisma, StandardStatus } from '@prisma/client'
import { VERIFIED_STANDARDS_CATALOG } from '@/lib/data/verified-standards'

/**
 * Service handling Indian Standards catalog queries
 * Uses Supabase/PostgreSQL when reachable, with authoritative fallback to the verified standards dataset.
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
      const [standards, total] = await Promise.race([
        Promise.all([
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
        ]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Prisma query timeout')), 2500)
        ),
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        data: standards as any[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      }
    } catch {
      // Authoritative fallback to verified standards catalog
      let filtered = [...VERIFIED_STANDARDS_CATALOG]

      if (category) {
        filtered = filtered.filter(
          (s) => s.category.toLowerCase() === category.toLowerCase()
        )
      }
      if (status) {
        filtered = filtered.filter((s) => s.status === status)
      }
      if (search) {
        const sLower = search.toLowerCase()
        filtered = filtered.filter(
          (s) =>
            s.standardNumber.toLowerCase().includes(sLower) ||
            s.title.toLowerCase().includes(sLower) ||
            (s.shortTitle && s.shortTitle.toLowerCase().includes(sLower))
        )
      }

      const total = filtered.length
      const paginated = filtered.slice(skip, skip + limit)
      const totalPages = Math.ceil(total / limit)

      return {
        data: paginated as any[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      }
    }
  }

  /**
   * Retrieve a single standard by ID or standardNumber with full relationships
   */
  static async getStandardById(id: string) {
    try {
      const standard = await Promise.race([
        prisma.standard.findFirst({
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
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Prisma query timeout')), 2500)
        ),
      ])

      if (standard) return standard
    } catch {
      // Fallback
    }

    const cleanId = id.toLowerCase().trim()
    const found = VERIFIED_STANDARDS_CATALOG.find(
      (s) =>
        s.id.toLowerCase() === cleanId ||
        s.standardNumber.toLowerCase() === cleanId
    )
    return found || null
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
      const [standards, total] = await Promise.race([
        Promise.all([
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
        ]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Prisma search timeout')), 2500)
        ),
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        data: standards as any[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      }
    } catch {
      const sLower = search.toLowerCase()
      const filtered = VERIFIED_STANDARDS_CATALOG.filter(
        (s) =>
          s.standardNumber.toLowerCase().includes(sLower) ||
          s.title.toLowerCase().includes(sLower) ||
          (s.shortTitle && s.shortTitle.toLowerCase().includes(sLower)) ||
          s.scope.toLowerCase().includes(sLower) ||
          s.category.toLowerCase().includes(sLower)
      )

      const total = filtered.length
      const paginated = filtered.slice(skip, skip + limit)
      const totalPages = Math.ceil(total / limit)

      return {
        data: paginated as any[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      }
    }
  }
}
