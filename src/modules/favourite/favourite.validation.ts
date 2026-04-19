import { z } from 'zod'

export const toggleFavouriteZodSchema = z.object({
  body: z
    .object({
      type: z.enum(['Map', 'Place', 'Offer'], {
        required_error: 'Type is required (Map, Place, or Offer)',
      }),
      map: z.string().optional(),
      place: z.string().optional(),
      offer: z.string().optional(),
    })
    .refine(
      (data) => {
        const count = [data.map, data.place, data.offer].filter(Boolean).length
        return count === 1
      },
      {
        message: 'Exactly one of map, place, or offer ID must be provided',
        path: ['body'],
      }
    ),
})
