"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("../config"));
async function test() {
    await mongoose_1.default.connect(config_1.default.database_url);
    const favs = await mongoose_1.default.connection.collection('favourites').find({ type: 'Place' }).toArray();
    const placeIds = favs.map(f => f.place);
    const places = await mongoose_1.default.connection.collection('places').find({ _id: { $in: placeIds } }).toArray();
    const businessPlaces = places.filter(p => p.type === 'Business');
    console.log('Fav places breakdown:', {
        totalFavPlaces: favs.length,
        regularPlaces: places.filter(p => p.type === 'Regular').length,
        businessPlaces: businessPlaces.length,
        businessPlaceNames: businessPlaces.map(p => ({ id: p._id, name: p.name, type: p.type }))
    });
    await mongoose_1.default.disconnect();
}
test().catch(console.error);
