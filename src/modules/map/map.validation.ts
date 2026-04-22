import { z } from 'zod'

export const createMapZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }),
    description: z.string({ required_error: 'Description is required' }),
    price: z.number().nonnegative().default(0),
    images: z.array(z.string()).min(1, 'At least one image is required'),
    features: z.array(z.string()).default([]),
    places: z.array(z.string()).default([]),
    country: z.string().optional(),
    status: z.enum(['Draft', 'Published']).default('Draft'),
    isPaid: z.boolean().default(false),
    rating: z.number().min(0).max(5).default(0),
    totalReview: z.number().nonnegative().default(0),
  }),
})

export const updateMapZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    price: z.number().nonnegative().optional(),
    images: z.array(z.string()).optional(),
    features: z.array(z.string()).optional(),
    places: z.array(z.string()).optional(),
    country: z.string().optional(),
    status: z.enum(['Draft', 'Published']).optional(),
    isPaid: z.boolean().optional(),
    rating: z.number().min(0).max(5).optional(),
    totalReview: z.number().nonnegative().optional(),
  }),
})
