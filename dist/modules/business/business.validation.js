"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBusinessStatusZodSchema = exports.updateBusinessZodSchema = exports.createBusinessZodSchema = void 0;
const zod_1 = require("zod");
const dayScheduleSchema = zod_1.z.object({
    days: zod_1.z.string({ required_error: 'Days range is required' }),
    openTime: zod_1.z.string({ required_error: 'Open time is required' }),
    closeTime: zod_1.z.string({ required_error: 'Close time is required' }),
});
exports.createBusinessZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: 'Business name is required' }),
        category: zod_1.z.string({ required_error: 'Category ID is required' }),
        description: zod_1.z.string({ required_error: 'Business description is required' }),
        contact: zod_1.z.object({
            phone: zod_1.z.string({ required_error: 'Public phone number is required' }),
            website: zod_1.z.string().url('Invalid website URL').optional().or(zod_1.z.literal('')),
            instagram: zod_1.z.string().optional().or(zod_1.z.literal('')),
        }),
        location: zod_1.z.object({
            address: zod_1.z.string({ required_error: 'Address is required' }),
            city: zod_1.z.string({ required_error: 'City is required' }),
            country: zod_1.z.string({ required_error: 'Country is required' }),
            mapLocation: zod_1.z.object({
                type: zod_1.z.literal('Point').default('Point'),
                coordinates: zod_1.z
                    .array(zod_1.z.number())
                    .length(2, 'Coordinates must be exactly [longitude, latitude]')
                    .nonempty(),
            }),
        }),
        hours: zod_1.z.object({
            customHours: zod_1.z.boolean().default(false),
            schedule: zod_1.z.array(dayScheduleSchema).default([]),
        }),
        media: zod_1.z.object({
            photos: zod_1.z.array(zod_1.z.string()).default([]),
            menu: zod_1.z.string().optional(),
        }).optional(),
        privateInfo: zod_1.z.object({
            ownerPhone: zod_1.z.string({ required_error: "Owner's Direct Phone is required" }),
            contactEmail: zod_1.z.string({ required_error: "Contact email is required" }).email('Invalid email address'),
        }),
    }),
});
exports.updateBusinessZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        contact: zod_1.z.object({
            phone: zod_1.z.string().optional(),
            website: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
            instagram: zod_1.z.string().optional().or(zod_1.z.literal('')),
        }).optional(),
        location: zod_1.z.object({
            address: zod_1.z.string().optional(),
            city: zod_1.z.string().optional(),
            country: zod_1.z.string().optional(),
            mapLocation: zod_1.z.object({
                type: zod_1.z.literal('Point').default('Point'),
                coordinates: zod_1.z.array(zod_1.z.number()).length(2),
            }).optional(),
        }).optional(),
        hours: zod_1.z.object({
            customHours: zod_1.z.boolean().optional(),
            schedule: zod_1.z.array(dayScheduleSchema).optional(),
        }).optional(),
        media: zod_1.z.object({
            photos: zod_1.z.array(zod_1.z.string()).optional(),
            menu: zod_1.z.string().optional(),
        }).optional(),
        privateInfo: zod_1.z.object({
            ownerPhone: zod_1.z.string().optional(),
            contactEmail: zod_1.z.string().email().optional(),
        }).optional(),
    }),
});
exports.updateBusinessStatusZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['Pending', 'Approved', 'Rejected'], {
            required_error: 'Status is required to update',
        }),
    }),
});
