"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderStopsZodSchema = exports.addStopZodSchema = exports.updateRoutePlanZodSchema = exports.createRoutePlanZodSchema = void 0;
const zod_1 = require("zod");
const routeStopItemSchema = zod_1.z
    .object({
    place: zod_1.z.string().optional(),
    business: zod_1.z.string().optional(),
    type: zod_1.z.enum(['Place', 'Business']).optional(),
    order: zod_1.z.number().int().nonnegative().optional(),
    note: zod_1.z.string().optional(),
})
    .refine(data => !!(data.place || data.business), {
    message: 'Either place or business ID must be provided for each stop',
});
exports.createRoutePlanZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z
            .string({ required_error: 'Route name is required' })
            .min(1, 'Route name cannot be empty'),
        description: zod_1.z.string().optional(),
        stops: zod_1.z.array(routeStopItemSchema).optional(),
        isPublic: zod_1.z.boolean().optional(),
    }),
});
exports.updateRoutePlanZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Route name cannot be empty').optional(),
        description: zod_1.z.string().optional(),
        stops: zod_1.z.array(routeStopItemSchema).optional(),
        isPublic: zod_1.z.boolean().optional(),
    }),
});
exports.addStopZodSchema = zod_1.z.object({
    body: routeStopItemSchema,
});
exports.reorderStopsZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        stops: zod_1.z.array(zod_1.z.object({
            stopId: zod_1.z.string().optional(),
            place: zod_1.z.string().optional(),
            business: zod_1.z.string().optional(),
            type: zod_1.z.enum(['Place', 'Business']).optional(),
            order: zod_1.z.number().int().nonnegative({
                message: 'Order must be a non-negative integer',
            }),
        })),
    }),
});
