"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePlaceZodSchema = exports.createPlaceZodSchema = void 0;
const zod_1 = require("zod");
exports.createPlaceZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: 'Place name is required' }),
        map: zod_1.z.string({ required_error: 'Map ID is required' }),
        category: zod_1.z.string({ required_error: 'Category ID is required' }),
        description: zod_1.z.string({ required_error: 'Description is required' }),
        media: zod_1.z.array(zod_1.z.string()).optional(),
        address: zod_1.z.string({ required_error: 'Address is required' }),
        location: zod_1.z.object({
            type: zod_1.z.literal('Point').default('Point'),
            coordinates: zod_1.z
                .array(zod_1.z.number())
                .length(2, 'Coordinates must have [longitude, latitude]')
                .nonempty(),
        }),
        access: zod_1.z.string().optional(),
        accessibility: zod_1.z
            .object({
            features: zod_1.z.array(zod_1.z.string()).optional(),
            notes: zod_1.z.string().optional(),
        })
            .optional(),
        recommendations: zod_1.z
            .object({
            tips: zod_1.z.string().optional(),
        })
            .optional(),
        services: zod_1.z.array(zod_1.z.string()).optional(),
        status: zod_1.z.enum(['Draft', 'Published']).default('Draft'),
    }),
});
exports.updatePlaceZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().optional(),
        map: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        media: zod_1.z.array(zod_1.z.string()).optional(),
        address: zod_1.z.string().optional(),
        location: zod_1.z
            .object({
            type: zod_1.z.literal('Point'),
            coordinates: zod_1.z.array(zod_1.z.number()).length(2),
        })
            .optional(),
        access: zod_1.z.string().optional(),
        accessibility: zod_1.z
            .object({
            features: zod_1.z.array(zod_1.z.string()).optional(),
            notes: zod_1.z.string().optional(),
        })
            .optional(),
        recommendations: zod_1.z
            .object({
            tips: zod_1.z.string().optional(),
        })
            .optional(),
        services: zod_1.z.array(zod_1.z.string()).optional(),
        status: zod_1.z.enum(['Draft', 'Published']).optional(),
    }),
});
