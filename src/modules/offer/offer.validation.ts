import { z } from 'zod'

export const createOfferZodSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }),
    photo: z.string().url().optional(),
    place: z.string({ required_error: 'Place ID is required' }),
    description: z.string({ required_error: 'Description is required' }),
    discountType: z.string({ required_error: 'Discount Type is required' }),
    discountValue: z.union([z.string(), z.number()]).optional(),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional(),
    redemptionRules: z.string().optional(),
    buttonLabel: z.string().optional(),
    status: z.enum(['Active', 'Expired', 'Paused']).default('Active'),
    redemptionsCount: z.number().default(0),
  }),
})

export const updateOfferZodSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    photo: z.string().url().optional(),
    place: z.string().optional(),
    description: z.string().optional(),
    discountType: z.string().optional(),
    discountValue: z.union([z.string(), z.number()]).optional(),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional(),
    redemptionRules: z.string().optional(),
    buttonLabel: z.string().optional(),
    status: z.enum(['Active', 'Expired', 'Paused']).optional(),
    redemptionsCount: z.number().optional(),
  }),
})
