import { z } from 'zod'

export const PaymentValidations = {
  create: z.object({
    body: z.object({
      mapId: z.string({
        required_error: 'Map ID is required',
      }),
      // Amount is optional — server always charges Map.price
      amount: z.number().min(1).optional(),
      currency: z.string().optional(),
      productName: z.string().optional(),
      description: z.string().optional(),
    }),
  }),

  update: z.object({
    body: z
      .object({
        status: z.enum(['succeeded', 'failed', 'refunded']).optional(),
        refundAmount: z.number().min(0).optional(),
        refundReason: z.string().optional(),
      })
      .strict(),
  }),

  webhook: z.object({
    body: z.object({
      type: z.string(),
      data: z.object({
        object: z.object({
          id: z.string(),
          status: z.string(),
          amount: z.number(),
          currency: z.string(),
          metadata: z.any().optional(),
        }),
      }),
    }),
  }),
}
