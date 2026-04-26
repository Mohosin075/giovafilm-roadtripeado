import { z } from 'zod'
import { placeDifficulty } from './place.constants'

export const createPlaceZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Place name is required' }),
    map: z.string({ required_error: 'Map ID is required' }),
    category: z.string({ required_error: 'Category ID is required' }),
    country: z.string().optional(),
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
    schedules: z.string().optional(),
    entryCost: z.string().optional(),
    difficulty: z.enum(placeDifficulty as [string, ...string[]]).optional(),
    hikeTime: z.string().optional(),
    atmosphere: z.string().optional(),
    status: z.enum(['Draft', 'Published']).default('Draft'),
    images: z.array(z.string()).optional(),
  }),
})

export const updatePlaceZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    map: z.string().optional(),
    category: z.string().optional(),
    country: z.string().optional(),
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
    schedules: z.string().optional(),
    entryCost: z.string().optional(),
    difficulty: z.enum(placeDifficulty as [string, ...string[]]).optional(),
    hikeTime: z.string().optional(),
    atmosphere: z.string().optional(),
    status: z.enum(['Draft', 'Published']).optional(),
    images: z.array(z.string()).optional(),
  }),
})
