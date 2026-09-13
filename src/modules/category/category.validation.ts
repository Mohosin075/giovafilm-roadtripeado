import { z } from 'zod'

const translatableSchema = z.union([
  z.string(),
  z.object({
    en: z.string().optional(),
    es: z.string().optional(),
  }),
])

export const createCategoryZodSchema = z.object({
  body: z.object({
    name: translatableSchema,
    color: z.string({ required_error: 'Color hex code is required' }),
    icon: z.string().optional(),
    images: z.any().optional(),
    status: z.enum(['Active', 'Hidden']).optional(),
  }),
})

export const updateCategoryZodSchema = z.object({
  body: z.object({
    name: translatableSchema.optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
    images: z.any().optional(),
    status: z.enum(['Active', 'Hidden']).optional(),
  }),
})
