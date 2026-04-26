import { z } from 'zod'

const dayScheduleSchema = z.object({
  days: z.string({ required_error: 'Days range is required' }),
  openTime: z.string({ required_error: 'Open time is required' }),
  closeTime: z.string({ required_error: 'Close time is required' }),
})

export const createBusinessZodSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Business name is required' }),
    category: z.string({ required_error: 'Category ID is required' }),
    description: z.string({ required_error: 'Business description is required' }),
    contact: z.object({
      phone: z.string({ required_error: 'Public phone number is required' }),
      website: z.string().url('Invalid website URL').optional().or(z.literal('')),
      instagram: z.string().optional().or(z.literal('')),
    }),
    location: z.object({
      address: z.string({ required_error: 'Address is required' }),
      city: z.string({ required_error: 'City is required' }),
      country: z.string({ required_error: 'Country is required' }),
      mapLocation: z.object({
        type: z.literal('Point').default('Point'),
        coordinates: z
          .array(z.number())
          .length(2, 'Coordinates must be exactly [longitude, latitude]')
          .nonempty(),
      }),
    }),
    hours: z.object({
      customHours: z.boolean().default(false),
      schedule: z.array(dayScheduleSchema).default([]),
    }),
    media: z.object({
      photos: z.array(z.string()).default([]),
      menu: z.string().optional(),
    }).optional(),
    privateInfo: z.object({
      ownerPhone: z.string({ required_error: "Owner's Direct Phone is required" }),
      contactEmail: z.string({ required_error: "Contact email is required" }).email('Invalid email address'),
    }),
    plan: z.string().optional(),
  }),
})

export const updateBusinessZodSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    contact: z.object({
      phone: z.string().optional(),
      website: z.string().url().optional().or(z.literal('')),
      instagram: z.string().optional().or(z.literal('')),
    }).optional(),
    location: z.object({
      address: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      mapLocation: z.object({
        type: z.literal('Point').default('Point'),
        coordinates: z.array(z.number()).length(2),
      }).optional(),
    }).optional(),
    hours: z.object({
      customHours: z.boolean().optional(),
      schedule: z.array(dayScheduleSchema).optional(),
    }).optional(),
    media: z.object({
      photos: z.array(z.string()).optional(),
      menu: z.string().optional(),
    }).optional(),
    privateInfo: z.object({
      ownerPhone: z.string().optional(),
      contactEmail: z.string().email().optional(),
    }).optional(),
    plan: z.string().optional(),
  }),
  isAccuracyVerified: z.boolean().optional(),
})

export const updateBusinessStatusZodSchema = z.object({
  body: z.object({
    status: z.enum(['Pending', 'Approved', 'Rejected'], {
      required_error: 'Status is required to update',
    }),
    isAccuracyVerified: z.boolean().optional(),
  }),
})
