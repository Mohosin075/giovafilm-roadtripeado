"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePublicZodSchema = exports.FaqValidations = exports.PublicValidation = void 0;
const zod_1 = require("zod");
exports.PublicValidation = {
    create: zod_1.z.object({
        body: zod_1.z.object({
            content: zod_1.z.string(),
            type: zod_1.z.enum(['privacy-policy', 'terms-and-condition', 'about']),
        }),
    }),
    update: zod_1.z.object({
        body: zod_1.z.object({
            content: zod_1.z.string(),
            type: zod_1.z.enum(['privacy-policy', 'terms-and-condition', 'about']),
        }),
    }),
};
exports.FaqValidations = {
    create: zod_1.z.object({
        body: zod_1.z.object({
            question: zod_1.z.string(),
            answer: zod_1.z.string(),
        }),
    }),
    update: zod_1.z.object({
        body: zod_1.z.object({
            question: zod_1.z.string().optional(),
            answer: zod_1.z.string().optional(),
        }),
    }),
};
exports.updatePublicZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        content: zod_1.z.string(),
    }),
});
