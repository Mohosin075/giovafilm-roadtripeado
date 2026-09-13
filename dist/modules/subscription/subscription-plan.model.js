"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionPlan = void 0;
const mongoose_1 = require("mongoose");
const subscriptionPlanSchema = new mongoose_1.Schema({
    name: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true,
    },
    description: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    currency: {
        type: String,
        required: true,
        default: 'usd',
    },
    interval: {
        type: String,
        enum: ['month', 'year'],
        required: true,
    },
    intervalCount: {
        type: Number,
        default: 1,
        min: 1,
    },
    trialPeriodDays: {
        type: Number,
        default: 10,
        min: 0,
    },
    features: {
        type: [mongoose_1.Schema.Types.Mixed],
        default: [],
    },
    maxPhotos: {
        type: Number,
        default: 1,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    stripePriceId: {
        type: String,
        required: true,
        // unique: true,
    },
    stripeProductId: {
        type: String,
        required: true,
    },
    priority: {
        type: Number,
        default: 1,
    },
}, {
    timestamps: true,
});
// Index for efficient queries
subscriptionPlanSchema.index({ isActive: 1 });
subscriptionPlanSchema.index({ stripePriceId: 1 });
exports.SubscriptionPlan = (0, mongoose_1.model)('SubscriptionPlan', subscriptionPlanSchema);
