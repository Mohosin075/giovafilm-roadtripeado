import { z } from 'zod'

export const toggleFavouriteZodSchema = z.object({
  body: z
    .object({
      type: z.enum(['Map', 'Place', 'Offer', 'Business'], {
        required_error: 'Type is required (Map, Place, Offer, or Business)',
      }),
      map: z.string().optional(),
      place: z.string().optional(),
      offer: z.string().optional(),
      business: z.string().optional(),
    })
    .refine(
      (data) => {
        const count = [data.map, data.place, data.offer, data.business].filter(
          Boolean,
        ).length
        return count === 1
      },
      {
        message:
          'Exactly one of map, place, offer, or business ID must be provided',
        path: ['body'],
      },
    ),
})
