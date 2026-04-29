import { z } from 'zod'

export const createCategoryZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Category name is required' }),
    color: z.string({ required_error: 'Color hex code is required' }),
    icon: z.string().optional(),
    status: z.enum(['Active', 'Hidden']).optional(),
  }),
})

export const updateCategoryZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
    status: z.enum(['Active', 'Hidden']).optional(),
  }),
})
