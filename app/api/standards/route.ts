import { NextRequest } from 'next/server'
import { StandardsService } from '@/lib/services/standards/standards.service'
import { standardsQuerySchema } from '@/lib/validations/standards'
import { paginatedResponse, handleApiError } from '@/lib/utils/api-response'

/**
 * List Indian Standards with pagination and filtering
 * GET /api/standards?page=1&limit=20&search=...&category=...&status=...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const rawParams = {
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    }

    const validatedQuery = standardsQuerySchema.parse(rawParams)
    const result = await StandardsService.getStandards(validatedQuery)

    return paginatedResponse(result.data, result.pagination)
  } catch (error) {
    return handleApiError(error)
  }
}
