"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const user_model_1 = require("../modules/user/user.model");
const map_model_1 = require("../modules/map/map.model");
const place_model_1 = require("../modules/place/place.model");
dotenv_1.default.config();
const DATABASE_URL = process.env.DATABASE_URL;
async function testUserAndMap() {
    var _a;
    await mongoose_1.default.connect(DATABASE_URL);
    const email = 'mohosinali075@gmail.com';
    const user = await user_model_1.User.findOne({ email });
    if (!user) {
        console.log(`User not found: ${email}`);
        await mongoose_1.default.disconnect();
        return;
    }
    console.log(`User found: ${user.name} (${user.email})`);
    console.log('Purchased Maps in DB:', user.purchasedMaps);
    const maps = await map_model_1.Map.find({});
    console.log('Available Maps in DB:');
    maps.forEach((m) => {
        console.log(`- ${m.name} (${m._id.toString()}) - isPaid: ${m.isPaid}`);
    });
    // Let's test the accessible map IDs logic
    const freeMaps = await map_model_1.Map.find({ isPaid: false }, '_id');
    const freeMapIds = freeMaps.map((m) => m._id.toString());
    const purchasedMapIds = ((_a = user.purchasedMaps) === null || _a === void 0 ? void 0 : _a.map((id) => id.toString())) || [];
    const accessibleMapIds = Array.from(new Set([...freeMapIds, ...purchasedMapIds]));
    console.log('User Accessible Map IDs:', accessibleMapIds);
    const usaMap = maps.find((m) => m.name.includes('Estados Unidos'));
    if (usaMap) {
        const usaMapId = usaMap._id.toString();
        const isUsaPurchased = accessibleMapIds.includes(usaMapId);
        console.log(`Is Estados Unidos Map Purchased/Accessible? ${isUsaPurchased}`);
        // Let's count places on USA map
        const places = await place_model_1.Place.find({ map: usaMap._id });
        console.log(`Total places on USA Map: ${places.length}`);
        const regularPlaces = places.filter((p) => p.type === 'Regular');
        const businessPlaces = places.filter((p) => p.type === 'Business');
        console.log(`- Regular Places: ${regularPlaces.length}`);
        console.log(`- Business Places: ${businessPlaces.length}`);
        // Check locking simulation
        const paidMaps = await map_model_1.Map.find({ isPaid: true }, '_id');
        const paidMapIds = paidMaps.map((m) => m._id.toString());
        const lockedMapIds = paidMapIds.filter((id) => !accessibleMapIds.includes(id));
        console.log('Locked Map IDs for User:', lockedMapIds);
        const isUsaLocked = lockedMapIds.includes(usaMapId);
        console.log(`Is USA Map Locked for User? ${isUsaLocked}`);
    }
    await mongoose_1.default.disconnect();
}
testUserAndMap();
