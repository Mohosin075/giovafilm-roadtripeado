import { z } from 'zod'

export const toggleFavouriteZodSchema = z.object({
  body: z.object({
    type: z.enum(['Map', 'Place'], {
      required_error: 'Type is required (Map or Place)',
    }),
    map: z.string().optional(),
    place: z.string().optional(),
  }).refine((data) => (data.map && !data.place) || (!data.map && data.place), {
    message: 'Either map or place ID must be provided, but not both',
    path: ['body'],
  }),
})
