"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCategoryZodSchema = exports.createCategoryZodSchema = void 0;
const zod_1 = require("zod");
exports.createCategoryZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: 'Category name is required' }),
        color: zod_1.z.string({ required_error: 'Color hex code is required' }),
        icon: zod_1.z.string().optional(),
        images: zod_1.z.any().optional(),
        status: zod_1.z.enum(['Active', 'Hidden']).optional(),
    }),
});
exports.updateCategoryZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().optional(),
        color: zod_1.z.string().optional(),
        icon: zod_1.z.string().optional(),
        images: zod_1.z.any().optional(),
        status: zod_1.z.enum(['Active', 'Hidden']).optional(),
    }),
});
