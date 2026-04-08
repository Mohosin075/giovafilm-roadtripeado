"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Award = void 0;
const mongoose_1 = require("mongoose");
const awardSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: [
            'Gourmet Guide',
            'Top Reviewer',
            'Trail Master',
            'History Buff',
            'Legendary Explorer',
        ],
        required: true,
    },
    progress: { type: Number, default: 0 },
    target: { type: Number, required: true },
    isUnlocked: { type: Boolean, default: false },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
exports.Award = (0, mongoose_1.model)('Award', awardSchema);
