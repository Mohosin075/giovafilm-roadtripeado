"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Category = void 0;
const mongoose_1 = require("mongoose");
const CategorySchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    color: { type: String, required: true, trim: true },
    icon: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: ['Active', 'Hidden'],
        default: 'Active',
    },
}, {
    timestamps: true,
});
exports.Category = (0, mongoose_1.model)('Category', CategorySchema);
