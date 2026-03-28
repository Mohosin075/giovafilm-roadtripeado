"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Offer = void 0;
const mongoose_1 = require("mongoose");
const offer_1 = require("../../enum/offer");
const OfferSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    photo: { type: String },
    place: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Place', required: true },
    description: { type: String, required: true },
    discountType: {
        type: String,
        enum: Object.values(offer_1.DISCOUNT_TYPE),
        required: true,
    },
    discountValue: { type: mongoose_1.Schema.Types.Mixed }, // String or Number
    validFrom: { type: Date },
    validUntil: { type: Date },
    redemptionRules: { type: String },
    buttonLabel: { type: String, default: 'Redeem Offer' },
    status: {
        type: String,
        enum: Object.values(offer_1.OFFER_STATUS),
        default: offer_1.OFFER_STATUS.ACTIVE,
    },
    redemptionsCount: { type: Number, default: 0 },
}, {
    timestamps: true,
});
exports.Offer = (0, mongoose_1.model)('Offer', OfferSchema);
