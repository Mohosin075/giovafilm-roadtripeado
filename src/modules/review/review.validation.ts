import { z } from 'zod'

export const createReviewSchema = z.object({
  body: z
    .object({
      placeId: z.string().optional(),
      businessId: z.string().optional(),
      rating: z.number().min(1).max(5),
      review: z.string().optional(),
      media: z.array(z.string()).optional(),
    })
    .refine(
      (data) => {
        const hasPlace = !!data.placeId
        const hasBusiness = !!data.businessId
        return (hasPlace && !hasBusiness) || (!hasPlace && hasBusiness)
      },
      {
        message: 'Exactly one of placeId or businessId is required',
        path: ['placeId'],
      },
    ),
})

export const updateReviewSchema = z.object({
  body: z.object({
    rating: z.number().min(1).max(5).optional(),
    review: z.string().optional(),
    media: z.array(z.string()).optional(),
  }),
})
