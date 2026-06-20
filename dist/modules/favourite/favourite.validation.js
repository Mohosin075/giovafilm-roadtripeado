"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleFavouriteZodSchema = void 0;
const zod_1 = require("zod");
exports.toggleFavouriteZodSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        type: zod_1.z.enum(['Map', 'Place', 'Offer'], {
            required_error: 'Type is required (Map, Place, or Offer)',
        }),
        map: zod_1.z.string().optional(),
        place: zod_1.z.string().optional(),
        offer: zod_1.z.string().optional(),
    })
        .refine((data) => {
        const count = [data.map, data.place, data.offer].filter(Boolean).length;
        return count === 1;
    }, {
        message: 'Exactly one of map, place, or offer ID must be provided',
        path: ['body'],
    }),
});
