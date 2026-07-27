"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwardConfig = void 0;
const mongoose_1 = require("mongoose");
const AwardConfigSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: [
            'PDF Itinerary',
            'Free Map',
            'Gourmet Guide',
            'Top Reviewer',
            'Trail Master',
            'History Buff',
            'Legendary Explorer',
        ],
        required: true,
        unique: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    coverPhoto: { type: String },
    target: { type: Number, required: true },
    fileUrl: { type: String },
    mapId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Map' },
}, {
    timestamps: true,
});
exports.AwardConfig = (0, mongoose_1.model)('AwardConfig', AwardConfigSchema);
