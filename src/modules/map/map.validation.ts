import { z } from 'zod'

export const createMapZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }),
    description: z.string({ required_error: 'Description is required' }),
    price: z.number().nonnegative().default(0),
    image: z.string({ required_error: 'Image URL is required' }),
    places: z.array(z.string()).default([]),
    status: z.enum(['Draft', 'Published']).default('Draft'),
    isPaid: z.boolean().default(false),
  }),
})

export const updateMapZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    price: z.number().nonnegative().optional(),
    image: z.string().optional(),
    places: z.array(z.string()).optional(),
    status: z.enum(['Draft', 'Published']).optional(),
    isPaid: z.boolean().optional(),
  }),
})
