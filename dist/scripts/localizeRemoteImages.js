"use strict";
/**
 * localizeRemoteImages.ts
 *
 * Places/Businesses whose media points at Google (maps.googleapis.com photo
 * links, mymaps hosted images, googleusercontent) never render in the browser:
 * the link carries a server API key and an expiring photo_reference.
 *
 * This script downloads each of those images once and rewrites the record to
 * the self-hosted /uploads/images/... path.
 *
 * Run: npx ts-node src/scripts/localizeRemoteImages.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const remoteImage_1 = require("../utils/remoteImage");
dotenv_1.default.config();
const DATABASE_URL = process.env.DATABASE_URL;
const PlaceSchema = new mongoose_1.default.Schema({
    name: { type: String },
    media: { type: [String], default: [] },
    menuImages: { type: [String], default: [] },
}, { strict: false });
const BusinessSchema = new mongoose_1.default.Schema({
    name: { type: String },
    media: {
        photos: { type: [String], default: [] },
        menu: { type: String },
    },
}, { strict: false });
const Place = mongoose_1.default.model('Place', PlaceSchema, 'places');
const Business = mongoose_1.default.model('Business', BusinessSchema, 'businesses');
/**
 * Replaces remote entries with local paths. A failed download keeps the original
 * entry: Google photo references expire, so those need a fresh reference from
 * fixPlaceImages.ts rather than being deleted here.
 */
const localizeList = async (list, label) => {
    const urls = Array.isArray(list) ? list.filter(item => typeof item === 'string') : [];
    const next = [];
    let changed = 0;
    let failed = 0;
    for (const url of urls) {
        if (!(0, remoteImage_1.isRemoteManagedImage)(url)) {
            next.push(url);
            continue;
        }
        const localPath = await (0, remoteImage_1.downloadImageToUploads)(url);
        if (localPath) {
            next.push(localPath);
            changed++;
            console.log(`  ✅ ${label} → ${localPath}`);
        }
        else {
            next.push(url);
            failed++;
            console.log(`  ⏭️  ${label} → download failed, entry kept`);
        }
    }
    return { next, changed, failed };
};
const run = async () => {
    var _a;
    if (!DATABASE_URL) {
        console.error('❌ DATABASE_URL not set');
        process.exit(1);
    }
    console.log('🔌 Connecting to MongoDB...');
    await mongoose_1.default.connect(DATABASE_URL);
    console.log('✅ Connected!\n');
    let totalChanged = 0;
    let totalFailed = 0;
    const places = await Place.find({}).lean();
    const placesToFix = places.filter((place) => (place.media || []).some(remoteImage_1.isRemoteManagedImage) ||
        (place.menuImages || []).some(remoteImage_1.isRemoteManagedImage));
    console.log(`📍 Places with remote images: ${placesToFix.length}`);
    for (const place of placesToFix) {
        console.log(`\n🔧 Place: ${place.name}`);
        const media = await localizeList(place.media, 'photo');
        const menu = await localizeList(place.menuImages, 'menu');
        await Place.findByIdAndUpdate(place._id, {
            $set: { media: media.next, menuImages: menu.next },
        });
        totalChanged += media.changed + menu.changed;
        totalFailed += media.failed + menu.failed;
    }
    const businesses = await Business.find({}).lean();
    const businessesToFix = businesses.filter((business) => { var _a; return (((_a = business.media) === null || _a === void 0 ? void 0 : _a.photos) || []).some(remoteImage_1.isRemoteManagedImage); });
    console.log(`\n🏢 Businesses with remote images: ${businessesToFix.length}`);
    for (const business of businessesToFix) {
        console.log(`\n🔧 Business: ${business.name}`);
        const photos = await localizeList((_a = business.media) === null || _a === void 0 ? void 0 : _a.photos, 'photo');
        await Business.findByIdAndUpdate(business._id, {
            $set: { 'media.photos': photos.next },
        });
        totalChanged += photos.changed;
        totalFailed += photos.failed;
    }
    console.log('\n═══════════════════════════════════════');
    console.log(`✅ Localized: ${totalChanged} image(s)`);
    console.log(`⏭️  Failed:    ${totalFailed} image(s)`);
    console.log('═══════════════════════════════════════\n');
    await mongoose_1.default.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
};
run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
