import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'DATABASE_ERROR'
  | 'BAD_REQUEST'
  | 'INTERNAL_SERVER_ERROR'

export interface ApiErrorResponse {
  error: {
    code: ErrorCode
    message: string
    details?: unknown
  }
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedApiResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

/**
 * Standardized success response
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

/**
 * Standardized paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  status = 200
) {
  const body: PaginatedApiResponse<T> = {
    data,
    pagination,
  }
  return NextResponse.json(body, { status })
}

/**
 * Standardized error response matching user specification:
 * { "error": { "code": "...", "message": "..." } }
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  status = 400,
  details?: unknown
) {
  const responseBody: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  }
  return NextResponse.json(responseBody, { status })
}

export class AppError extends Error {
  public code: ErrorCode
  public status: number
  public details?: unknown

  constructor(
    message: string,
    code: ErrorCode = 'BAD_REQUEST',
    status = 400,
    details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = status
    this.details = details
  }
}

const KNOWN_SAFE_ERROR_PREFIXES = [
  'File is too large',
  'File exceeds',
  'Unable to extract text from this PDF',
  'Unable to process this DOCX document',
  'Unsupported file type',
  'Document contains no extractable text',
  'No file was provided',
  'The uploaded file is empty',
  'Please enter a specification',
]

/**
 * Helper to handle errors gracefully without leaking internal information or stack traces
 */
export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    const issues = error.issues || []
    const formattedErrors = issues.map((err) => ({
      field: Array.isArray(err.path) ? err.path.join('.') : '',
      message: err.message,
    }))
    return errorResponse(
      'VALIDATION_ERROR',
      formattedErrors[0]?.message || 'Invalid request parameters',
      400,
      formattedErrors
    )
  }

  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details)
  }

  if (error instanceof Error) {
    const isKnownSafe = KNOWN_SAFE_ERROR_PREFIXES.some((prefix) =>
      error.message.startsWith(prefix)
    )
    if (isKnownSafe) {
      return errorResponse('BAD_REQUEST', error.message, 400)
    }
  }

  // Safe logging in server console for diagnostics
  console.error('[API Error]:', error)

  return errorResponse(
    'INTERNAL_SERVER_ERROR',
    'An unexpected internal server error occurred. Please try again later.',
    500
  )
}
