import { z } from 'zod'
import { placeDifficulty } from './place.constants'

const translatableSchema = z.union([
  z.string(),
  z.object({
    en: z.string().optional(),
    es: z.string().optional(),
  }),
])

export const createPlaceZodSchema = z.object({
  body: z.object({
    name: translatableSchema,
    map: z.string({ required_error: 'Map ID is required' }),
    category: z.string({ required_error: 'Category ID is required' }),
    type: z.enum(['Business', 'Regular']).optional(),
    country: z.string().optional(),
    description: translatableSchema,
    media: z.array(z.string()).optional(),
    menuImages: z.array(z.string()).optional(),
    address: z.string({ required_error: 'Address is required' }),
    location: z.object({
      type: z.literal('Point').default('Point'),
      coordinates: z
        .array(z.number())
        .length(2, 'Coordinates must have [longitude, latitude]')
        .nonempty(),
    }),
    access: translatableSchema.optional(),
    accessibility: z
      .object({
        features: z.array(z.string()).optional(),
        notes: translatableSchema.optional(),
      })
      .optional(),
    recommendations: z
      .object({
        tips: translatableSchema.optional(),
      })
      .optional(),
    services: z.array(z.string()).optional(),
    schedules: z.string().optional(),
    operatingHours: z.record(z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean(),
    })).optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    instagram: z.string().optional(),
    entryCost: translatableSchema.optional(),
    difficulty: translatableSchema.optional(),
    hikeTime: translatableSchema.optional(),
    atmosphere: translatableSchema.optional(),
    status: z.enum(['Draft', 'Published', 'Pending', 'Rejected']).default('Draft'),
    images: z.union([z.string(), z.array(z.string())]).optional(),
    documents: z.union([z.string(), z.array(z.string())]).optional(),
  }),
})

export const updatePlaceZodSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Place ID is required' }),
  }),
  body: z.object({
    name: translatableSchema.optional(),
    map: z.string().optional(),
    category: z.string().optional(),
    type: z.enum(['Business', 'Regular']).optional(),
    country: z.string().optional(),
    description: translatableSchema.optional(),
    media: z.array(z.string()).optional(),
    menuImages: z.array(z.string()).optional(),
    address: z.string().optional(),
    location: z
      .object({
        type: z.literal('Point'),
        coordinates: z.array(z.number()).length(2),
      })
      .optional(),
    access: translatableSchema.optional(),
    accessibility: z
      .object({
        features: z.array(z.string()).optional(),
        notes: translatableSchema.optional(),
      })
      .optional(),
    recommendations: z
      .object({
        tips: translatableSchema.optional(),
      })
      .optional(),
    services: z.array(z.string()).optional(),
    schedules: z.string().optional(),
    operatingHours: z.record(z.object({
      open: z.string(),
      close: z.string(),
      closed: z.boolean(),
    })).optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    instagram: z.string().optional(),
    entryCost: translatableSchema.optional(),
    difficulty: translatableSchema.optional(),
    hikeTime: translatableSchema.optional(),
    atmosphere: translatableSchema.optional(),
    status: z.enum(['Draft', 'Published', 'Pending', 'Rejected']).optional(),
    adminFeedback: z.string().optional(),
    images: z.union([z.string(), z.array(z.string())]).optional(),
    documents: z.union([z.string(), z.array(z.string())]).optional(),
  }),
})

export const recommendPlaceZodSchema = z.object({
  body: z.object({
    name: translatableSchema,
    map: z.string({ required_error: 'Map ID is required' }),
    category: z.string({ required_error: 'Category ID is required' }),
    type: z.enum(['Business', 'Regular']).optional(),
    country: z.string().optional(),
    description: translatableSchema.optional(),
    media: z.array(z.string()).optional(),
    menuImages: z.array(z.string()).optional(),
    address: z.string({ required_error: 'Address is required' }),
    location: z.object({
      type: z.literal('Point').default('Point'),
      coordinates: z
        .array(z.number())
        .length(2, 'Coordinates must have [longitude, latitude]')
        .nonempty(),
    }),
    access: translatableSchema.optional(),
    accessibility: z
      .object({
        features: z.array(z.string()).optional(),
        notes: translatableSchema.optional(),
      })
      .optional(),
    recommendations: z
      .object({
        tips: translatableSchema.optional(),
      })
      .optional(),
    services: z.array(z.string()).optional(),
    schedules: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    instagram: z.string().optional(),
    entryCost: translatableSchema.optional(),
    difficulty: translatableSchema.optional(),
    hikeTime: translatableSchema.optional(),
    atmosphere: translatableSchema.optional(),
    images: z.union([z.string(), z.array(z.string())]).optional(),
    documents: z.union([z.string(), z.array(z.string())]).optional(),
  }),
})

export const reviewPlaceZodSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Place ID is required' }),
  }),
  body: z.object({
    status: z.enum(['Published', 'Rejected'], {
      required_error: 'Status must be Published or Rejected',
    }),
    adminFeedback: z.string().optional(),
    pointsAwarded: z.number().min(0).optional(),
  }),
})
