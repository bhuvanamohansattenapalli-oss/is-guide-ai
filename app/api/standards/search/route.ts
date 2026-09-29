import { NextRequest } from 'next/server'
import { StandardsService } from '@/lib/services/standards/standards.service'
import { searchStandardsQuerySchema } from '@/lib/validations/standards'
import { paginatedResponse, handleApiError } from '@/lib/utils/api-response'

/**
 * Keyword / lexical database search across standard fields
 * GET /api/standards/search?search=LED&page=1&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const rawParams = {
      search: searchParams.get('search') ?? '',
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    }

    const validatedQuery = searchStandardsQuerySchema.parse(rawParams)
    const result = await StandardsService.searchStandards(validatedQuery)

    return paginatedResponse(result.data, result.pagination)
  } catch (error) {
    return handleApiError(error)
  }
}
