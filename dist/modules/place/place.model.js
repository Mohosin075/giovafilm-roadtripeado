"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Place = void 0;
const mongoose_1 = require("mongoose");
const place_constants_1 = require("./place.constants");
const PlaceSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    map: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Map', required: true },
    category: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Category', required: true },
    type: {
        type: String,
        enum: ['Business', 'Regular'],
        default: 'Regular',
    },
    country: { type: String, required: true },
    description: { type: String, required: true },
    media: { type: [String], default: [] },
    address: { type: String, required: true },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
            required: true,
        },
        coordinates: {
            type: [Number],
            required: true,
        },
    },
    access: { type: String },
    accessibility: {
        features: { type: [String], default: [] },
        notes: { type: String },
    },
    recommendations: {
        tips: { type: String },
    },
    services: { type: [String], default: [] },
    schedules: { type: String },
    entryCost: { type: String },
    difficulty: {
        type: String,
        enum: place_constants_1.placeDifficulty,
        default: 'Easy',
        set: (v) => (v === '' ? undefined : v),
    },
    hikeTime: { type: String },
    atmosphere: { type: String },
    status: {
        type: String,
        enum: ['Draft', 'Published'],
        default: 'Draft',
    },
    rating: { type: Number, default: 0 },
    totalReview: { type: Number, default: 0 },
    openCount: { type: Number, default: 0 },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
PlaceSchema.index({ location: '2dsphere' }); // important for geo queries!
exports.Place = (0, mongoose_1.model)('Place', PlaceSchema);
