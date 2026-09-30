"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LevelConfig = void 0;
const mongoose_1 = require("mongoose");
const LevelConfigSchema = new mongoose_1.Schema({
    level: { type: Number, required: true, unique: true },
    name: { type: mongoose_1.Schema.Types.Mixed, required: true },
    points: { type: Number, required: true, default: 0 },
    reviews: { type: Number, required: true, default: 0 },
    badgeUrl: { type: String },
    description: { type: mongoose_1.Schema.Types.Mixed },
}, {
    timestamps: true,
});
exports.LevelConfig = (0, mongoose_1.model)('LevelConfig', LevelConfigSchema);
