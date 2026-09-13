"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMapZodSchema = exports.createMapZodSchema = void 0;
const zod_1 = require("zod");
const translatableSchema = zod_1.z.union([
    zod_1.z.string(),
    zod_1.z.object({
        en: zod_1.z.string().optional(),
        es: zod_1.z.string().optional(),
    }),
]);
exports.createMapZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: translatableSchema,
        description: translatableSchema,
        price: zod_1.z.number().nonnegative().default(0),
        images: zod_1.z.array(zod_1.z.string()).min(1, 'At least one image is required'),
        features: zod_1.z.array(zod_1.z.string()).default([]),
        places: zod_1.z.array(zod_1.z.string()).default([]),
        country: zod_1.z.string().optional(),
        status: zod_1.z.enum(['Draft', 'Published']).default('Draft'),
        isPaid: zod_1.z.boolean().default(false),
        rating: zod_1.z.number().min(0).max(5).default(0),
        totalReview: zod_1.z.number().nonnegative().default(0),
        isActive: zod_1.z.boolean().default(true),
    }),
});
exports.updateMapZodSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: 'Map ID is required' }),
    }),
    body: zod_1.z.object({
        name: translatableSchema.optional(),
        description: translatableSchema.optional(),
        price: zod_1.z.number().nonnegative().optional(),
        images: zod_1.z.array(zod_1.z.string()).optional(),
        features: zod_1.z.array(zod_1.z.string()).optional(),
        places: zod_1.z.array(zod_1.z.string()).optional(),
        country: zod_1.z.string().optional(),
        status: zod_1.z.enum(['Draft', 'Published']).optional(),
        isPaid: zod_1.z.boolean().optional(),
        rating: zod_1.z.number().min(0).max(5).optional(),
        totalReview: zod_1.z.number().nonnegative().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
