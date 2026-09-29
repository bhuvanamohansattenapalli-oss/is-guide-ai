import { NextRequest } from 'next/server'
import { StandardsService } from '@/lib/services/standards/standards.service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Retrieve a specific Indian Standard by ID or standardNumber
 * GET /api/standards/[id]
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    if (!id || typeof id !== 'string') {
      return errorResponse('BAD_REQUEST', 'Standard ID parameter is required', 400)
    }

    const standard = await StandardsService.getStandardById(id)

    if (!standard) {
      return errorResponse('NOT_FOUND', `Standard with identifier "${id}" not found`, 404)
    }

    return successResponse({ standard }, 200)
  } catch (error) {
    return handleApiError(error)
  }
}
