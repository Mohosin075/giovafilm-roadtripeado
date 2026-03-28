import { z } from 'zod'
import { OFFER_STATUS, DISCOUNT_TYPE } from '../../enum/offer'

export const createOfferZodSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required' }),
    photo: z.string().url().optional(),
    place: z.string({ required_error: 'Place ID is required' }),
    description: z.string({ required_error: 'Description is required' }),
    discountType: z.nativeEnum(DISCOUNT_TYPE, {
      required_error: 'Discount Type is required',
    }),
    discountValue: z.union([z.string(), z.number()]).optional(),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional(),
    redemptionRules: z.string().optional(),
    buttonLabel: z.string().optional(),
    status: z.nativeEnum(OFFER_STATUS).default(OFFER_STATUS.ACTIVE),
    redemptionsCount: z.number().default(0),
  }).superRefine((data, ctx) => {
    if (data.discountType === DISCOUNT_TYPE.PERCENTAGE) {
      const val = Number(data.discountValue);
      if (isNaN(val) || val <= 0 || val > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Percentage discount must be between 1 and 100',
          path: ['discountValue'],
        })
      }
    } else if (data.discountType === DISCOUNT_TYPE.FLAT) {
      const val = Number(data.discountValue);
      if (isNaN(val) || val <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Flat discount must be a positive number',
          path: ['discountValue'],
        })
      }
    }
  }),
})

export const updateOfferZodSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    photo: z.string().url().optional(),
    place: z.string().optional(),
    description: z.string().optional(),
    discountType: z.nativeEnum(DISCOUNT_TYPE).optional(),
    discountValue: z.union([z.string(), z.number()]).optional(),
    validFrom: z.string().datetime().optional(),
    validUntil: z.string().datetime().optional(),
    redemptionRules: z.string().optional(),
    buttonLabel: z.string().optional(),
    status: z.nativeEnum(OFFER_STATUS).optional(),
    redemptionsCount: z.number().nonnegative().optional(),
  }).superRefine((data, ctx) => {
    if (data.discountType === DISCOUNT_TYPE.PERCENTAGE) {
      const val = Number(data.discountValue);
      if (isNaN(val) || val <= 0 || val > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Percentage discount must be between 1 and 100',
          path: ['discountValue'],
        })
      }
    } else if (data.discountType === DISCOUNT_TYPE.FLAT) {
      const val = Number(data.discountValue);
      if (isNaN(val) || val <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Flat discount must be a positive number',
          path: ['discountValue'],
        })
      }
    }
  }),
})
