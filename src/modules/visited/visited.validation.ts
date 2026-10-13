import { z } from 'zod'

export const toggleVisitedZodSchema = z.object({
  body: z
    .object({
      placeId: z.string().optional(),
      place: z.string().optional(),
      business: z.string().optional(),
      id: z.string().optional(),
      type: z.enum(['Place', 'Business']).optional(),
    })
    .refine((data) => !!(data.placeId || data.place || data.business || data.id), {
      message: 'placeId is required',
    }),
})
