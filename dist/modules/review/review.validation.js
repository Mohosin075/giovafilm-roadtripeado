"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReviewSchema = exports.createReviewSchema = void 0;
const zod_1 = require("zod");
exports.createReviewSchema = zod_1.z.object({
    body: zod_1.z.object({
        placeId: zod_1.z.string({ required_error: 'Place ID is required' }),
        rating: zod_1.z.number().min(1).max(5),
        review: zod_1.z.string({ required_error: 'Review content is required' }),
        media: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
exports.updateReviewSchema = zod_1.z.object({
    body: zod_1.z.object({
        rating: zod_1.z.number().min(1).max(5).optional(),
        review: zod_1.z.string().optional(),
        media: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
