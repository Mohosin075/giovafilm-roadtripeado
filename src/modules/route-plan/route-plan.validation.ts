import { z } from 'zod'

const routeStopItemSchema = z
  .object({
    place: z.string().optional(),
    business: z.string().optional(),
    type: z.enum(['Place', 'Business']).optional(),
    order: z.number().int().nonnegative().optional(),
    note: z.string().optional(),
  })
  .refine(data => !!(data.place || data.business), {
    message: 'Either place or business ID must be provided for each stop',
  })

export const createRoutePlanZodSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Route name is required' })
      .min(1, 'Route name cannot be empty'),
    description: z.string().optional(),
    stops: z.array(routeStopItemSchema).optional(),
    isPublic: z.boolean().optional(),
  }),
})

export const updateRoutePlanZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Route name cannot be empty').optional(),
    description: z.string().optional(),
    stops: z.array(routeStopItemSchema).optional(),
    isPublic: z.boolean().optional(),
  }),
})

export const addStopZodSchema = z.object({
  body: routeStopItemSchema,
})

export const reorderStopsZodSchema = z.object({
  body: z.object({
    stops: z.array(
      z.object({
        stopId: z.string().optional(),
        place: z.string().optional(),
        business: z.string().optional(),
        type: z.enum(['Place', 'Business']).optional(),
        order: z.number().int().nonnegative({
          message: 'Order must be a non-negative integer',
        }),
      })
    ),
  }),
})
