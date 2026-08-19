"use strict";
/**
 * dedupePlaces.ts
 *
 * একই জায়গা একাধিকবার DB তে ঢুকে গেছে — সেগুলো সরায়।
 * প্রতি group এ সবচেয়ে সম্পূর্ণ doc রাখা হয় (বেশি ছবি → বড় description →
 * বেশি view), আর বাদ পড়া doc এ যদি address/description বেশি থাকে সেটা
 * রাখা doc এ merge হয়ে যায়। মোছার আগে পুরো doc backup হয়।
 *
 * Dry run : npx ts-node src/scripts/dedupePlaces.ts
 * Apply   : npx ts-node src/scripts/dedupePlaces.ts --apply
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
/** একই নাম হলেও এর চেয়ে দূরে হলে আলাদা জায়গা (যেমন দুই শহরের একই নামের গির্জা) */
const SAME_SPOT_M = 50;
/** নাম আলাদা কিন্তু হাতে যাচাই করে দেখা গেছে একই জায়গা */
const MANUAL_DUPLICATE_GROUPS = [
    ['69ebd7c8668604cc975235ce', '6a024a2bd5f1a69dce5ad046'], // Pa Onde Sea
    ['6a024a15d5f1a69dce5acecc', '6a400ffe4f5c84ad3becfa2b'], // Escambrón
    ['6a024a54d5f1a69dce5ad2f8', '6a024a76d5f1a69dce5ad51c'], // Ruinas de Caparra
];
/** পুরো group টাই আবর্জনা — কোনো copy রাখার দরকার নেই */
const JUNK_NAMES = ['sdf'];
const Place = mongoose_1.default.model('Place', new mongoose_1.default.Schema({}, { strict: false }), 'places');
const normalize = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const distanceM = ([lng1, lat1], [lng2, lat2]) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(a));
};
const richness = (place) => {
    var _a;
    return [
        ((_a = place.media) === null || _a === void 0 ? void 0 : _a.length) || 0,
        String(place.description || '').length,
        place.openCount || 0,
        String(place.address || '').length,
    ];
};
/** সবচেয়ে সম্পূর্ণ doc আগে */
const byRichness = (a, b) => {
    const left = richness(a);
    const right = richness(b);
    for (let i = 0; i < left.length; i++) {
        if (left[i] !== right[i])
            return right[i] - left[i];
    }
    return 0;
};
/** বাদ পড়া doc এ যা বেশি আছে সেটুকু রাখা doc এ তুলে আনি */
const mergedFields = (keeper, dropped) => {
    const patch = {};
    for (const field of ['address', 'description', 'access', 'country']) {
        const best = [keeper, ...dropped]
            .map(place => String(place[field] || '').trim())
            .sort((a, b) => b.length - a.length)[0];
        if (best && best !== String(keeper[field] || '').trim())
            patch[field] = best;
    }
    return patch;
};
const groupDuplicates = (places) => {
    var _a, _b;
    const groups = [];
    const used = new Set();
    const idOf = (place) => String(place._id);
    for (const ids of MANUAL_DUPLICATE_GROUPS) {
        const group = places.filter(place => ids.includes(idOf(place)));
        if (group.length > 1) {
            group.forEach(place => used.add(idOf(place)));
            groups.push(group);
        }
    }
    const byName = new Map();
    for (const place of places) {
        if (used.has(idOf(place)))
            continue;
        const key = normalize(place.name);
        if (JUNK_NAMES.includes(key))
            continue;
        byName.set(key, [...(byName.get(key) || []), place]);
    }
    for (const candidates of byName.values()) {
        if (candidates.length < 2)
            continue;
        // একই নামের মধ্যে যারা একই বিন্দুতে, শুধু তারাই এক group
        const remaining = [...candidates];
        while (remaining.length) {
            const head = remaining.shift();
            const cluster = [head];
            for (let i = remaining.length - 1; i >= 0; i--) {
                const a = (_a = head.location) === null || _a === void 0 ? void 0 : _a.coordinates;
                const b = (_b = remaining[i].location) === null || _b === void 0 ? void 0 : _b.coordinates;
                if (a && b && distanceM(a, b) <= SAME_SPOT_M) {
                    cluster.push(remaining.splice(i, 1)[0]);
                }
            }
            if (cluster.length > 1)
                groups.push(cluster);
        }
    }
    return groups;
};
const run = async () => {
    var _a;
    await mongoose_1.default.connect(process.env.DATABASE_URL);
    console.log(`✅ Connected  (${APPLY ? 'APPLY' : 'DRY RUN'})\n`);
    const places = await Place.find({}).lean();
    const groups = groupDuplicates(places);
    const toDelete = [];
    const patches = [];
    for (const group of groups) {
        const [keeper, ...dropped] = [...group].sort(byRichness);
        toDelete.push(...dropped);
        console.log(`══ ${keeper.name}`);
        console.log(`   keep   ${keeper._id}  media=${((_a = keeper.media) === null || _a === void 0 ? void 0 : _a.length) || 0} desc=${String(keeper.description || '').length}ch`);
        dropped.forEach(place => {
            var _a;
            return console.log(`   delete ${place._id}  "${place.name}"  media=${((_a = place.media) === null || _a === void 0 ? void 0 : _a.length) || 0} desc=${String(place.description || '').length}ch`);
        });
        const patch = mergedFields(keeper, dropped);
        if (Object.keys(patch).length) {
            patches.push({ id: keeper._id, patch });
            console.log(`   merge  ${Object.keys(patch).join(', ')}`);
        }
    }
    const junk = places.filter(place => JUNK_NAMES.includes(normalize(place.name)));
    if (junk.length) {
        console.log(`\n══ junk entries`);
        junk.forEach(place => console.log(`   delete ${place._id}  "${place.name}"`));
        toDelete.push(...junk);
    }
    console.log(`\n═══════════════════════════════════════`);
    console.log(`duplicate groups : ${groups.length}`);
    console.log(`docs to delete   : ${toDelete.length}`);
    console.log(`docs to enrich   : ${patches.length}`);
    console.log(`═══════════════════════════════════════`);
    if (!APPLY) {
        console.log('\nDry run — nothing changed. Add --apply to run it.');
        await mongoose_1.default.disconnect();
        return;
    }
    const backupDir = path_1.default.join(process.cwd(), 'scratch');
    if (!fs_1.default.existsSync(backupDir))
        fs_1.default.mkdirSync(backupDir, { recursive: true });
    const backupPath = path_1.default.join(backupDir, `deduped-places-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs_1.default.writeFileSync(backupPath, JSON.stringify(toDelete, null, 2));
    console.log(`\n💾 Backup: ${backupPath}`);
    for (const { id, patch } of patches) {
        await Place.findByIdAndUpdate(id, { $set: patch });
    }
    const result = await Place.deleteMany({
        _id: { $in: toDelete.map(place => place._id) },
    });
    console.log(`🗑️  Deleted: ${result.deletedCount} place(s)`);
    await mongoose_1.default.disconnect();
};
run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
