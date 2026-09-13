"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlaceZodSchema = exports.createPlaceZodSchema = void 0;
const zod_1 = require("zod");
const translatableSchema = zod_1.z.union([
    zod_1.z.string(),
    zod_1.z.object({
        en: zod_1.z.string().optional(),
        es: zod_1.z.string().optional(),
    }),
]);
exports.createPlaceZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: translatableSchema,
        map: zod_1.z.string({ required_error: 'Map ID is required' }),
        category: zod_1.z.string({ required_error: 'Category ID is required' }),
        type: zod_1.z.enum(['Business', 'Regular']).optional(),
        country: zod_1.z.string().optional(),
        description: translatableSchema,
        media: zod_1.z.array(zod_1.z.string()).optional(),
        menuImages: zod_1.z.array(zod_1.z.string()).optional(),
        address: zod_1.z.string({ required_error: 'Address is required' }),
        location: zod_1.z.object({
            type: zod_1.z.literal('Point').default('Point'),
            coordinates: zod_1.z
                .array(zod_1.z.number())
                .length(2, 'Coordinates must have [longitude, latitude]')
                .nonempty(),
        }),
        access: translatableSchema.optional(),
        accessibility: zod_1.z
            .object({
            features: zod_1.z.array(zod_1.z.string()).optional(),
            notes: translatableSchema.optional(),
        })
            .optional(),
        recommendations: zod_1.z
            .object({
            tips: translatableSchema.optional(),
        })
            .optional(),
        services: zod_1.z.array(zod_1.z.string()).optional(),
        schedules: zod_1.z.string().optional(),
        operatingHours: zod_1.z.record(zod_1.z.object({
            open: zod_1.z.string(),
            close: zod_1.z.string(),
            closed: zod_1.z.boolean(),
        })).optional(),
        phone: zod_1.z.string().optional(),
        website: zod_1.z.string().optional(),
        instagram: zod_1.z.string().optional(),
        entryCost: translatableSchema.optional(),
        difficulty: translatableSchema.optional(),
        hikeTime: translatableSchema.optional(),
        atmosphere: translatableSchema.optional(),
        status: zod_1.z.enum(['Draft', 'Published']).default('Draft'),
        images: zod_1.z.array(zod_1.z.string()).optional(),
        documents: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
exports.updatePlaceZodSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: 'Place ID is required' }),
    }),
    body: zod_1.z.object({
        name: translatableSchema.optional(),
        map: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
        type: zod_1.z.enum(['Business', 'Regular']).optional(),
        country: zod_1.z.string().optional(),
        description: translatableSchema.optional(),
        media: zod_1.z.array(zod_1.z.string()).optional(),
        menuImages: zod_1.z.array(zod_1.z.string()).optional(),
        address: zod_1.z.string().optional(),
        location: zod_1.z
            .object({
            type: zod_1.z.literal('Point'),
            coordinates: zod_1.z.array(zod_1.z.number()).length(2),
        })
            .optional(),
        access: translatableSchema.optional(),
        accessibility: zod_1.z
            .object({
            features: zod_1.z.array(zod_1.z.string()).optional(),
            notes: translatableSchema.optional(),
        })
            .optional(),
        recommendations: zod_1.z
            .object({
            tips: translatableSchema.optional(),
        })
            .optional(),
        services: zod_1.z.array(zod_1.z.string()).optional(),
        schedules: zod_1.z.string().optional(),
        operatingHours: zod_1.z.record(zod_1.z.object({
            open: zod_1.z.string(),
            close: zod_1.z.string(),
            closed: zod_1.z.boolean(),
        })).optional(),
        phone: zod_1.z.string().optional(),
        website: zod_1.z.string().optional(),
        instagram: zod_1.z.string().optional(),
        entryCost: translatableSchema.optional(),
        difficulty: translatableSchema.optional(),
        hikeTime: translatableSchema.optional(),
        atmosphere: translatableSchema.optional(),
        status: zod_1.z.enum(['Draft', 'Published']).optional(),
        images: zod_1.z.array(zod_1.z.string()).optional(),
        documents: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
