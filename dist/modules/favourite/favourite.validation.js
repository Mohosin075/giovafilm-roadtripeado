"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleFavouriteZodSchema = void 0;
const zod_1 = require("zod");
exports.toggleFavouriteZodSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        type: zod_1.z.enum(['Map', 'Place', 'Offer', 'Business'], {
            required_error: 'Type is required (Map, Place, Offer, or Business)',
        }),
        map: zod_1.z.string().optional(),
        place: zod_1.z.string().optional(),
        offer: zod_1.z.string().optional(),
        business: zod_1.z.string().optional(),
    })
        .refine((data) => {
        const count = [data.map, data.place, data.offer, data.business].filter(Boolean).length;
        return count === 1;
    }, {
        message: 'Exactly one of map, place, offer, or business ID must be provided',
        path: ['body'],
    }),
});
