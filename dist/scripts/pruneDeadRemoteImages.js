"use strict";
/**
 * pruneDeadRemoteImages.ts
 *
 * DB তে থেকে যাওয়া Google hosted image link গুলো সরায়। ওই link এ API key থাকে
 * আর photo_reference expire করে, তাই browser এ broken image দেখায় —
 * entry মুছে দিলে UI placeholder দেখাবে।
 *
 * Run: npx ts-node src/scripts/pruneDeadRemoteImages.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const remoteImage_1 = require("../utils/remoteImage");
dotenv_1.default.config();
const DATABASE_URL = process.env.DATABASE_URL;
const Place = mongoose_1.default.model('Place', new mongoose_1.default.Schema({}, { strict: false }), 'places');
const Business = mongoose_1.default.model('Business', new mongoose_1.default.Schema({}, { strict: false }), 'businesses');
const keepUsable = (list) => (Array.isArray(list) ? list : [])
    .filter((item) => typeof item === 'string')
    .filter(url => !(0, remoteImage_1.isRemoteManagedImage)(url));
const run = async () => {
    var _a, _b, _c, _d, _e;
    if (!DATABASE_URL) {
        console.error('❌ DATABASE_URL not set');
        process.exit(1);
    }
    await mongoose_1.default.connect(DATABASE_URL);
    console.log('✅ Connected\n');
    let removed = 0;
    let touchedPlaces = 0;
    const places = await Place.find({}).lean();
    for (const place of places) {
        const media = keepUsable(place.media);
        const menuImages = keepUsable(place.menuImages);
        const before = (((_a = place.media) === null || _a === void 0 ? void 0 : _a.length) || 0) + (((_b = place.menuImages) === null || _b === void 0 ? void 0 : _b.length) || 0);
        const after = media.length + menuImages.length;
        if (before === after)
            continue;
        await Place.findByIdAndUpdate(place._id, { $set: { media, menuImages } });
        removed += before - after;
        touchedPlaces++;
        console.log(`🔧 ${place.name}: removed ${before - after}, kept ${after} image(s)`);
    }
    let touchedBusinesses = 0;
    const businesses = await Business.find({}).lean();
    for (const business of businesses) {
        const photos = keepUsable((_c = business === null || business === void 0 ? void 0 : business.media) === null || _c === void 0 ? void 0 : _c.photos);
        const before = ((_e = (_d = business === null || business === void 0 ? void 0 : business.media) === null || _d === void 0 ? void 0 : _d.photos) === null || _e === void 0 ? void 0 : _e.length) || 0;
        if (before === photos.length)
            continue;
        await Business.findByIdAndUpdate(business._id, {
            $set: { 'media.photos': photos },
        });
        removed += before - photos.length;
        touchedBusinesses++;
        console.log(`🔧 ${business.name}: removed ${before - photos.length}, kept ${photos.length} photo(s)`);
    }
    console.log('\n═══════════════════════════════════════');
    console.log(`🗑️  Dead links removed : ${removed}`);
    console.log(`📍 Places updated      : ${touchedPlaces}`);
    console.log(`🏢 Businesses updated  : ${touchedBusinesses}`);
    console.log('═══════════════════════════════════════\n');
    await mongoose_1.default.disconnect();
};
run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
