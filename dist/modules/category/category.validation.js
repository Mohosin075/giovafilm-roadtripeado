"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCategoryZodSchema = exports.createCategoryZodSchema = void 0;
const zod_1 = require("zod");
const translatableSchema = zod_1.z.union([
    zod_1.z.string(),
    zod_1.z.object({
        en: zod_1.z.string().optional(),
        es: zod_1.z.string().optional(),
    }),
]);
exports.createCategoryZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: translatableSchema,
        color: zod_1.z.string({ required_error: 'Color hex code is required' }),
        icon: zod_1.z.string().optional(),
        images: zod_1.z.any().optional(),
        status: zod_1.z.enum(['Active', 'Hidden']).optional(),
    }),
});
exports.updateCategoryZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: translatableSchema.optional(),
        color: zod_1.z.string().optional(),
        icon: zod_1.z.string().optional(),
        images: zod_1.z.any().optional(),
        status: zod_1.z.enum(['Active', 'Hidden']).optional(),
    }),
});
