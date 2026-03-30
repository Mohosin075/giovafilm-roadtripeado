import { z } from 'zod'

export const createReviewSchema = z.object({
  body: z.object({
    placeId: z.string({ required_error: 'Place ID is required' }),
    rating: z.number().min(1).max(5),
    review: z.string({ required_error: 'Review content is required' }),
    media: z.array(z.string()).optional(),
  }),
})

export const updateReviewSchema = z.object({
  body: z.object({
    rating: z.number().min(1).max(5).optional(),
    review: z.string().optional(),
    media: z.array(z.string()).optional(),
  }),
})
