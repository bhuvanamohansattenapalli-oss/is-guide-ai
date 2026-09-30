import { z } from 'zod'

export const createAnalysisSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title cannot exceed 200 characters'),
  inputType: z.enum(['TEXT', 'PDF', 'DOCX'], {
    invalid_type_error: 'Input type must be TEXT, PDF, or DOCX',
  }).default('TEXT'),
  rawInput: z
    .string({ required_error: 'Raw input content is required' })
    .trim()
    .min(1, 'Specification content cannot be empty')
    .max(100000, 'Specification content exceeds maximum allowed size (100,000 characters)'),
  language: z.string().trim().max(10).optional().default('en'),
  fileName: z.string().trim().optional(),
  fileType: z.string().trim().optional(),
  fileSize: z.number().int().optional(),
})

export type CreateAnalysisInput = z.infer<typeof createAnalysisSchema>

export const analysisQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
})

export type AnalysisQueryInput = z.infer<typeof analysisQuerySchema>
