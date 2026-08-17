import { z } from 'zod'
import { OFFER_STATUS, DISCOUNT_TYPE, BOGO_SECOND_TYPE } from '../../enum/offer'

const refineDiscount = (
  data: {
    discountType?: DISCOUNT_TYPE
    discountValue?: string | number
    bogoSecondType?: BOGO_SECOND_TYPE
  },
  ctx: z.RefinementCtx,
) => {
  if (data.discountType === DISCOUNT_TYPE.PERCENTAGE) {
    const val = Number(data.discountValue)
    if (isNaN(val) || val <= 0 || val > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Percentage discount must be between 1 and 100',
        path: ['discountValue'],
      })
    }
  } else if (data.discountType === DISCOUNT_TYPE.FLAT) {
    const val = Number(data.discountValue)
    if (isNaN(val) || val <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Flat discount must be a positive number',
        path: ['discountValue'],
      })
    }
  } else if (data.discountType === DISCOUNT_TYPE.BOGO) {
    const secondType = data.bogoSecondType || BOGO_SECOND_TYPE.FREE
    if (secondType === BOGO_SECOND_TYPE.PERCENTAGE) {
      const val = Number(data.discountValue)
      if (isNaN(val) || val <= 0 || val > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'BOGO second-item discount must be between 1 and 100',
          path: ['discountValue'],
        })
      }
    }
  }
}

export const createOfferZodSchema = z.object({
  body: z
    .object({
      title: z.string({ required_error: 'Title is required' }),
      photo: z.string().optional(),
      images: z.any().optional(),
      place: z.string().optional(),
      business: z.string().optional(),
      description: z.string({ required_error: 'Description is required' }),
      discountType: z.nativeEnum(DISCOUNT_TYPE, {
        required_error: 'Discount Type is required',
      }),
      discountValue: z.union([z.string(), z.number()]).optional(),
      bogoSecondType: z.nativeEnum(BOGO_SECOND_TYPE).optional(),
      validFrom: z.string().datetime().optional().nullable(),
      validUntil: z.string().datetime().optional().nullable(),
      noExpiration: z.boolean().optional(),
      maxRedemptions: z.number().optional(),
      totalRedemptionLimit: z.number().optional().nullable(),
      redemptionRules: z.array(z.string()).optional(),
      buttonLabel: z.string().optional(),
      redemptionDuration: z.number().optional(),
      status: z.nativeEnum(OFFER_STATUS).default(OFFER_STATUS.ACTIVE),
      redemptionsCount: z.number().default(0),
    })
    .superRefine(refineDiscount),
})

export const updateOfferZodSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Offer ID is required' }),
  }),
  body: z
    .object({
      title: z.string().optional(),
      photo: z.string().optional(),
      images: z.any().optional(),
      place: z.string().optional(),
      business: z.string().optional(),
      description: z.string().optional(),
      discountType: z.nativeEnum(DISCOUNT_TYPE).optional(),
      discountValue: z.union([z.string(), z.number()]).optional(),
      bogoSecondType: z.nativeEnum(BOGO_SECOND_TYPE).optional(),
      validFrom: z.string().datetime().optional().nullable(),
      validUntil: z.string().datetime().optional().nullable(),
      noExpiration: z.boolean().optional(),
      maxRedemptions: z.number().optional(),
      totalRedemptionLimit: z.number().optional().nullable(),
      redemptionRules: z.array(z.string()).optional(),
      buttonLabel: z.string().optional(),
      redemptionDuration: z.number().optional(),
      status: z.nativeEnum(OFFER_STATUS).optional(),
      redemptionsCount: z.number().nonnegative().optional(),
    })
    .superRefine(refineDiscount),
})
