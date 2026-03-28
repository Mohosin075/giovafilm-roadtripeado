import { z } from 'zod'

export const createPlaceZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Place name is required' }),
    category: z.string({ required_error: 'Category ID is required' }),
    description: z.string({ required_error: 'Description is required' }),
    media: z.array(z.string()).optional(),
    address: z.string({ required_error: 'Address is required' }),
    location: z.object({
      type: z.literal('Point').default('Point'),
      coordinates: z
        .array(z.number())
        .length(2, 'Coordinates must have [longitude, latitude]')
        .nonempty(),
    }),
    access: z.string().optional(),
    accessibility: z
      .object({
        features: z.array(z.string()).optional(),
        notes: z.string().optional(),
      })
      .optional(),
    recommendations: z
      .object({
        tips: z.string().optional(),
      })
      .optional(),
    services: z.array(z.string()).optional(),
    status: z.enum(['Draft', 'Published']).default('Draft'),
  }),
})

export const updatePlaceZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    media: z.array(z.string()).optional(),
    address: z.string().optional(),
    location: z
      .object({
        type: z.literal('Point'),
        coordinates: z.array(z.number()).length(2),
      })
      .optional(),
    access: z.string().optional(),
    accessibility: z
      .object({
        features: z.array(z.string()).optional(),
        notes: z.string().optional(),
      })
      .optional(),
    recommendations: z
      .object({
        tips: z.string().optional(),
      })
      .optional(),
    services: z.array(z.string()).optional(),
    status: z.enum(['Draft', 'Published']).optional(),
  }),
})
