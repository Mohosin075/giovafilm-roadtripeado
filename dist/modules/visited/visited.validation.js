"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleVisitedZodSchema = void 0;
const zod_1 = require("zod");
exports.toggleVisitedZodSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        placeId: zod_1.z.string().optional(),
        place: zod_1.z.string().optional(),
        business: zod_1.z.string().optional(),
        id: zod_1.z.string().optional(),
        type: zod_1.z.enum(['Place', 'Business']).optional(),
    })
        .refine((data) => !!(data.placeId || data.place || data.business || data.id), {
        message: 'placeId is required',
    }),
});
