"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Review = void 0;
const mongoose_1 = require("mongoose");
const reviewSchema = new mongoose_1.Schema({
    placeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Place', required: true },
    reviewer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true },
    media: { type: [String], default: [] },
}, {
    timestamps: true,
});
exports.Review = (0, mongoose_1.model)('Review', reviewSchema);
