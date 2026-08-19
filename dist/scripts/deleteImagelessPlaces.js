"use strict";
/**
 * deleteImagelessPlaces.ts
 *
 * যেসব Place এ কোনো ছবি নেই সেগুলো DB থেকে মুছে দেয়।
 * মোছার আগে সবসময় scratch/deleted-places-<timestamp>.json এ পুরো document
 * backup রাখে, যাতে ভুল হলে ফিরিয়ে আনা যায়।
 *
 * Dry run : npx ts-node src/scripts/deleteImagelessPlaces.ts
 * Apply   : npx ts-node src/scripts/deleteImagelessPlaces.ts --apply
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const mongoose_1 = __importDefault(require("mongoose"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const APPLY = process.argv.includes('--apply');
const Place = mongoose_1.default.model('Place', new mongoose_1.default.Schema({}, { strict: false }), 'places');
const run = async () => {
    await mongoose_1.default.connect(process.env.DATABASE_URL);
    console.log(`✅ Connected  (${APPLY ? 'APPLY' : 'DRY RUN'})\n`);
    const places = await Place.find({}).lean();
    const targets = places.filter(place => !Array.isArray(place.media) || place.media.length === 0);
    targets.forEach((place, index) => console.log(`${String(index + 1).padStart(2)}. ${place.name}  [${place.country || '-'}]`));
    console.log(`\ntotal: ${targets.length}`);
    if (!APPLY) {
        console.log('\nDry run — nothing deleted. Add --apply to delete.');
        await mongoose_1.default.disconnect();
        return;
    }
    const backupDir = path_1.default.join(process.cwd(), 'scratch');
    if (!fs_1.default.existsSync(backupDir))
        fs_1.default.mkdirSync(backupDir, { recursive: true });
    const backupPath = path_1.default.join(backupDir, `deleted-places-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs_1.default.writeFileSync(backupPath, JSON.stringify(targets, null, 2));
    console.log(`\n💾 Backup: ${backupPath}`);
    const result = await Place.deleteMany({
        _id: { $in: targets.map(place => place._id) },
    });
    console.log(`🗑️  Deleted: ${result.deletedCount} place(s)`);
    await mongoose_1.default.disconnect();
};
run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
