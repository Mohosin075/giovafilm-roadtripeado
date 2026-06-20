"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOfferZodSchema = exports.createOfferZodSchema = void 0;
const zod_1 = require("zod");
const offer_1 = require("../../enum/offer");
exports.createOfferZodSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string({ required_error: 'Title is required' }),
        photo: zod_1.z.string().optional(),
        images: zod_1.z.any().optional(),
        place: zod_1.z.string().optional(),
        business: zod_1.z.string().optional(),
        description: zod_1.z.string({ required_error: 'Description is required' }),
        discountType: zod_1.z.nativeEnum(offer_1.DISCOUNT_TYPE, {
            required_error: 'Discount Type is required',
        }),
        discountValue: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
        validFrom: zod_1.z.string().datetime().optional().nullable(),
        validUntil: zod_1.z.string().datetime().optional().nullable(),
        noExpiration: zod_1.z.boolean().optional(),
        maxRedemptions: zod_1.z.number().optional(),
        redemptionRules: zod_1.z.array(zod_1.z.string()).optional(),
        buttonLabel: zod_1.z.string().optional(),
        redemptionDuration: zod_1.z.number().optional(),
        status: zod_1.z.nativeEnum(offer_1.OFFER_STATUS).default(offer_1.OFFER_STATUS.ACTIVE),
        redemptionsCount: zod_1.z.number().default(0),
    }).superRefine((data, ctx) => {
        if (data.discountType === offer_1.DISCOUNT_TYPE.PERCENTAGE) {
            const val = Number(data.discountValue);
            if (isNaN(val) || val <= 0 || val > 100) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    message: 'Percentage discount must be between 1 and 100',
                    path: ['discountValue'],
                });
            }
        }
        else if (data.discountType === offer_1.DISCOUNT_TYPE.FLAT) {
            const val = Number(data.discountValue);
            if (isNaN(val) || val <= 0) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    message: 'Flat discount must be a positive number',
                    path: ['discountValue'],
                });
            }
        }
    }),
});
exports.updateOfferZodSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: 'Offer ID is required' }),
    }),
    body: zod_1.z.object({
        title: zod_1.z.string().optional(),
        photo: zod_1.z.string().optional(),
        images: zod_1.z.any().optional(),
        place: zod_1.z.string().optional(),
        business: zod_1.z.string().optional(),
        description: zod_1.z.string().optional(),
        discountType: zod_1.z.nativeEnum(offer_1.DISCOUNT_TYPE).optional(),
        discountValue: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
        validFrom: zod_1.z.string().datetime().optional().nullable(),
        validUntil: zod_1.z.string().datetime().optional().nullable(),
        noExpiration: zod_1.z.boolean().optional(),
        maxRedemptions: zod_1.z.number().optional(),
        redemptionRules: zod_1.z.array(zod_1.z.string()).optional(),
        buttonLabel: zod_1.z.string().optional(),
        redemptionDuration: zod_1.z.number().optional(),
        status: zod_1.z.nativeEnum(offer_1.OFFER_STATUS).optional(),
        redemptionsCount: zod_1.z.number().nonnegative().optional(),
    }).superRefine((data, ctx) => {
        if (data.discountType === offer_1.DISCOUNT_TYPE.PERCENTAGE) {
            const val = Number(data.discountValue);
            if (isNaN(val) || val <= 0 || val > 100) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    message: 'Percentage discount must be between 1 and 100',
                    path: ['discountValue'],
                });
            }
        }
        else if (data.discountType === offer_1.DISCOUNT_TYPE.FLAT) {
            const val = Number(data.discountValue);
            if (isNaN(val) || val <= 0) {
                ctx.addIssue({
                    code: zod_1.z.ZodIssueCode.custom,
                    message: 'Flat discount must be a positive number',
                    path: ['discountValue'],
                });
            }
        }
    }),
});
