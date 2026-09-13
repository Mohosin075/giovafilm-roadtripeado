"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Place = void 0;
const mongoose_1 = require("mongoose");
const place_constants_1 = require("./place.constants");
const PlaceSchema = new mongoose_1.Schema({
    name: { type: mongoose_1.Schema.Types.Mixed, required: true },
    map: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Map', required: true },
    category: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Category', required: true },
    type: {
        type: String,
        enum: ['Business', 'Regular'],
        default: 'Regular',
    },
    country: { type: String, required: true },
    description: { type: mongoose_1.Schema.Types.Mixed, required: true },
    media: { type: [String], default: [] },
    menuImages: { type: [String], default: [] },
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
    access: { type: mongoose_1.Schema.Types.Mixed },
    accessibility: {
        features: { type: [String], default: [] },
        notes: { type: mongoose_1.Schema.Types.Mixed },
    },
    recommendations: {
        tips: { type: mongoose_1.Schema.Types.Mixed },
    },
    services: { type: [String], default: [] },
    schedules: { type: String },
    operatingHours: { type: mongoose_1.Schema.Types.Mixed, default: null },
    phone: { type: String, default: "" },
    website: { type: String, default: "" },
    instagram: { type: String, default: "" },
    entryCost: { type: mongoose_1.Schema.Types.Mixed },
    difficulty: {
        type: String,
        enum: place_constants_1.placeDifficulty,
        default: 'Easy',
        set: (v) => (v === '' ? undefined : v),
    },
    hikeTime: { type: mongoose_1.Schema.Types.Mixed },
    atmosphere: { type: mongoose_1.Schema.Types.Mixed },
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
PlaceSchema.index({ map: 1, status: 1 }); // most common filter: map + status
PlaceSchema.index({ category: 1 }); // category filter
PlaceSchema.index({ status: 1 }); // status filter alone
PlaceSchema.index({ country: 1 }); // country filter
PlaceSchema.index(// text search on searchable fields
{ name: 'text', description: 'text', address: 'text', country: 'text' }, { weights: { name: 10, address: 5, description: 2, country: 1 } });
exports.Place = (0, mongoose_1.model)('Place', PlaceSchema);
