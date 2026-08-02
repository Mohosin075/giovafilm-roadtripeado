"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateReviewSchema = exports.createReviewSchema = void 0;
const zod_1 = require("zod");
exports.createReviewSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        placeId: zod_1.z.string().optional(),
        businessId: zod_1.z.string().optional(),
        rating: zod_1.z.number().min(1).max(5),
        review: zod_1.z.string().optional(),
        media: zod_1.z.array(zod_1.z.string()).optional(),
    })
        .refine((data) => {
        const hasPlace = !!data.placeId;
        const hasBusiness = !!data.businessId;
        return (hasPlace && !hasBusiness) || (!hasPlace && hasBusiness);
    }, {
        message: 'Exactly one of placeId or businessId is required',
        path: ['placeId'],
    }),
});
exports.updateReviewSchema = zod_1.z.object({
    body: zod_1.z.object({
        rating: zod_1.z.number().min(1).max(5).optional(),
        review: zod_1.z.string().optional(),
        media: zod_1.z.array(zod_1.z.string()).optional(),
    }),
});
