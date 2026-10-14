"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Visited = void 0;
const mongoose_1 = require("mongoose");
const VisitedSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    place: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Place',
    },
    business: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Business',
    },
    type: {
        type: String,
        enum: ['Place', 'Business'],
        default: 'Place',
        required: true,
    },
    visitedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
VisitedSchema.index({ user: 1, visitedAt: -1 });
VisitedSchema.index({ user: 1, place: 1 });
VisitedSchema.index({ user: 1, business: 1 });
VisitedSchema.index({ user: 1, type: 1 });
exports.Visited = (0, mongoose_1.model)('Visited', VisitedSchema);
