"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMapZodSchema = exports.createMapZodSchema = void 0;
const zod_1 = require("zod");
exports.createMapZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: 'Name is required' }),
        description: zod_1.z.string({ required_error: 'Description is required' }),
        price: zod_1.z.number().nonnegative().default(0),
        images: zod_1.z.array(zod_1.z.string()).min(1, 'At least one image is required'),
        features: zod_1.z.array(zod_1.z.string()).default([]),
        places: zod_1.z.array(zod_1.z.string()).default([]),
        status: zod_1.z.enum(['Draft', 'Published']).default('Draft'),
        isPaid: zod_1.z.boolean().default(false),
        rating: zod_1.z.number().min(0).max(5).default(0),
        totalReview: zod_1.z.number().nonnegative().default(0),
    }),
});
exports.updateMapZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        price: zod_1.z.number().nonnegative().optional(),
        images: zod_1.z.array(zod_1.z.string()).optional(),
        features: zod_1.z.array(zod_1.z.string()).optional(),
        places: zod_1.z.array(zod_1.z.string()).optional(),
        status: zod_1.z.enum(['Draft', 'Published']).optional(),
        isPaid: zod_1.z.boolean().optional(),
        rating: zod_1.z.number().min(0).max(5).optional(),
        totalReview: zod_1.z.number().nonnegative().optional(),
    }),
});
