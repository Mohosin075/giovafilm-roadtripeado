"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Business = void 0;
const mongoose_1 = require("mongoose");
const BusinessSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    contact: {
        phone: { type: String, required: true },
        website: { type: String },
        instagram: { type: String },
    },
    location: {
        address: { type: String, required: true },
        city: { type: String, required: true },
        country: { type: String, required: true },
        mapLocation: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
                required: true,
            },
            coordinates: {
                type: [Number],
                required: true, // [longitude, latitude]
            },
        },
    },
    hours: {
        customHours: { type: Boolean, default: false },
        schedule: [
            {
                days: { type: String },
                openTime: { type: String },
                closeTime: { type: String },
            },
        ],
    },
    media: {
        photos: { type: [String], default: [] },
        menu: { type: String },
    },
    privateInfo: {
        ownerPhone: { type: String, required: true },
        contactEmail: { type: String, required: true },
    },
    plan: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'SubscriptionPlan',
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Index for geo queries
BusinessSchema.index({ 'location.mapLocation': '2dsphere' });
exports.Business = (0, mongoose_1.model)('Business', BusinessSchema);
