"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Favourite = void 0;
const mongoose_1 = require("mongoose");
const FavouriteSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    map: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Map',
    },
    place: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Place',
    },
    offer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Offer',
    },
    type: {
        type: String,
        enum: ['Map', 'Place', 'Offer'],
        required: true,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
FavouriteSchema.index({ user: 1 }); // get user's favourites
FavouriteSchema.index({ user: 1, type: 1 }); // filter by type
FavouriteSchema.index({ user: 1, map: 1 }); // check if map is favourited
FavouriteSchema.index({ user: 1, place: 1 }); // check if place is favourited
FavouriteSchema.index({ user: 1, offer: 1 }); // check if offer is favourited
exports.Favourite = (0, mongoose_1.model)('Favourite', FavouriteSchema);
