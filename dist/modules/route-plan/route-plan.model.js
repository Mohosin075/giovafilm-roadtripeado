"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutePlan = void 0;
const mongoose_1 = require("mongoose");
const RouteStopSchema = new mongoose_1.Schema({
    place: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Place',
        default: null,
    },
    business: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Business',
        default: null,
    },
    type: {
        type: String,
        enum: ['Place', 'Business'],
        default: 'Place',
    },
    order: {
        type: Number,
        required: true,
        default: 0,
    },
    note: {
        type: String,
        trim: true,
        default: '',
    },
}, { _id: true });
const RoutePlanSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        default: 'Mi Roadtrip',
    },
    description: {
        type: String,
        trim: true,
        default: '',
    },
    stops: {
        type: [RouteStopSchema],
        default: [],
    },
    isPublic: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
// Index for efficient user queries
RoutePlanSchema.index({ user: 1, updatedAt: -1 });
exports.RoutePlan = (0, mongoose_1.model)('RoutePlan', RoutePlanSchema);
