import { z } from 'zod'

export const standardsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'WITHDRAWN', 'SUPERSEDED', 'DRAFT', 'UNKNOWN']).optional(),
})

export type StandardsQueryInput = z.infer<typeof standardsQuerySchema>

export const searchStandardsQuerySchema = z.object({
  search: z
    .string({ required_error: 'Search query is required' })
    .trim()
    .min(1, 'Search query cannot be empty')
    .max(100, 'Search query cannot exceed 100 characters'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().min(1).max(100).default(20),
})

export type SearchStandardsQueryInput = z.infer<typeof searchStandardsQuerySchema>
