"use strict";
/**
 * fillMissingPlaceImages.ts
 *
 * যেসব Place এ এখনো কোনো ছবি নেই সেগুলোর জন্য Google Places এ খোঁজে।
 * fixPlaceImages.ts এর চেয়ে বেশি চেষ্টা করে: text search এর পাশাপাশি pin এর
 * চারপাশে nearby search ও করে, আর ভুল জায়গার ছবি ঠেকাতে নাম ও দূরত্ব মিলিয়ে দেখে।
 *
 * Dry run : npx ts-node src/scripts/fillMissingPlaceImages.ts
 * Apply   : npx ts-node src/scripts/fillMissingPlaceImages.ts --apply
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const remoteImage_1 = require("../utils/remoteImage");
dotenv_1.default.config();
const DATABASE_URL = process.env.DATABASE_URL;
const GOOGLE_API_KEY = process.env.SERVER_MAP_API_KEY;
const APPLY = process.argv.includes('--apply');
const MAX_PHOTOS = 3;
/** একই pin ধরা যায়, তাই নাম না মিললেও নেওয়া যায় */
const SAME_PIN_KM = 0.5;
/** nearby result — কাছাকাছি হলে নাম কিছুটা মিললেই চলে */
const NEARBY_KM = 2;
/** text search — নাম প্রায় হুবহু মিললে তবেই, দূরত্ব এর মধ্যে হতে হবে */
const TEXT_MATCH_KM = 25;
const STRONG_NAME_SCORE = 0.85;
const LOOSE_NAME_SCORE = 0.5;
const Place = mongoose_1.default.model('Place', new mongoose_1.default.Schema({}, { strict: false }), 'places');
const normalize = (value) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
/** 1 = হুবহু, 0 = কোনো মিল নেই */
const nameScore = (left, right) => {
    const a = normalize(left);
    const b = normalize(right);
    if (!a || !b)
        return 0;
    if (a === b)
        return 1;
    // "ceiba" এর মতো ছোট generic নাম যেকোনো কিছুর ভেতরে বসে যায়, তাই বাদ
    const shorter = a.length <= b.length ? a : b;
    const isSubstring = a.includes(b) || b.includes(a);
    if (isSubstring && (shorter.includes(' ') || shorter.length >= 6))
        return 0.85;
    const tokensA = new Set(a.split(' '));
    const tokensB = new Set(b.split(' '));
    const shared = [...tokensA].filter(token => tokensB.has(token)).length;
    return shared / new Set([...tokensA, ...tokensB]).size;
};
const distanceKm = ([lng1, lat1], [lng2, lat2]) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(a));
};
const toCandidates = (results, coordinates, placeName, source) => (results || [])
    .filter(result => { var _a; return (result === null || result === void 0 ? void 0 : result.place_id) && ((_a = result === null || result === void 0 ? void 0 : result.geometry) === null || _a === void 0 ? void 0 : _a.location); })
    .map(result => ({
    placeId: result.place_id,
    name: result.name,
    distance: coordinates
        ? distanceKm(coordinates, [
            result.geometry.location.lng,
            result.geometry.location.lat,
        ])
        : Number.POSITIVE_INFINITY,
    score: nameScore(placeName, result.name),
    source,
}));
/** সবচেয়ে ভালো মিল আগে — প্রথমটায় ছবি না থাকলে পরেরটা দেখা হবে */
const rankCandidates = (candidates) => {
    const acceptable = candidates.filter(candidate => {
        if (candidate.distance <= SAME_PIN_KM)
            return true;
        if (candidate.source === 'nearby' &&
            candidate.distance <= NEARBY_KM &&
            candidate.score >= LOOSE_NAME_SCORE) {
            return true;
        }
        return (candidate.distance <= TEXT_MATCH_KM && candidate.score >= STRONG_NAME_SCORE);
    });
    const seen = new Set();
    return acceptable
        .sort((a, b) => b.score - a.score || a.distance - b.distance)
        .filter(candidate => {
        if (seen.has(candidate.placeId))
            return false;
        seen.add(candidate.placeId);
        return true;
    });
};
const searchGoogle = async (placeName, country, coordinates) => {
    var _a, _b;
    const candidates = [];
    if (coordinates) {
        const nearby = await axios_1.default.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
            params: {
                location: `${coordinates[1]},${coordinates[0]}`,
                radius: 1500,
                keyword: placeName,
                key: GOOGLE_API_KEY,
            },
            timeout: 10000,
            validateStatus: () => true,
        });
        candidates.push(...toCandidates((_a = nearby.data) === null || _a === void 0 ? void 0 : _a.results, coordinates, placeName, 'nearby'));
    }
    const text = await axios_1.default.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
        params: {
            query: `${placeName} ${country}`,
            key: GOOGLE_API_KEY,
            ...(coordinates
                ? { location: `${coordinates[1]},${coordinates[0]}`, radius: 20000 }
                : {}),
        },
        timeout: 10000,
        validateStatus: () => true,
    });
    candidates.push(...toCandidates((_b = text.data) === null || _b === void 0 ? void 0 : _b.results, coordinates, placeName, 'text'));
    return candidates;
};
const fetchPhotoReferences = async (placeId) => {
    var _a, _b;
    const details = await axios_1.default.get('https://maps.googleapis.com/maps/api/place/details/json', {
        params: { place_id: placeId, fields: 'photos', key: GOOGLE_API_KEY },
        timeout: 10000,
        validateStatus: () => true,
    });
    return (((_b = (_a = details.data) === null || _a === void 0 ? void 0 : _a.result) === null || _b === void 0 ? void 0 : _b.photos) || [])
        .slice(0, MAX_PHOTOS)
        .map((photo) => photo.photo_reference);
};
const run = async () => {
    var _a;
    if (!DATABASE_URL || !GOOGLE_API_KEY) {
        console.error('❌ DATABASE_URL / SERVER_MAP_API_KEY missing');
        process.exit(1);
    }
    await mongoose_1.default.connect(DATABASE_URL);
    console.log(`✅ Connected  (${APPLY ? 'APPLY' : 'DRY RUN'})\n`);
    const places = await Place.find({}).lean();
    const empty = places.filter(place => !Array.isArray(place.media) || place.media.length === 0);
    console.log(`📍 Places without images: ${empty.length}\n`);
    let filled = 0;
    let noMatch = 0;
    let noPhoto = 0;
    for (const place of empty) {
        const coordinates = Array.isArray((_a = place.location) === null || _a === void 0 ? void 0 : _a.coordinates) &&
            place.location.coordinates.length === 2
            ? place.location.coordinates
            : null;
        const candidates = await searchGoogle(place.name, place.country || 'Puerto Rico', coordinates);
        const ranked = rankCandidates(candidates);
        if (!ranked.length) {
            console.log(`⏭️  ${place.name} — no confident match`);
            noMatch++;
            continue;
        }
        let match = null;
        let references = [];
        for (const candidate of ranked.slice(0, 4)) {
            references = await fetchPhotoReferences(candidate.placeId);
            if (references.length) {
                match = candidate;
                break;
            }
        }
        if (!match) {
            console.log(`⏭️  ${place.name} → "${ranked[0].name}" (${ranked[0].distance.toFixed(1)} km) — no photos`);
            noPhoto++;
            continue;
        }
        console.log(`✅ ${place.name} → "${match.name}" (${match.distance.toFixed(1)} km, score ${match.score.toFixed(2)}, ${references.length} photo)`);
        if (!APPLY) {
            filled++;
            continue;
        }
        const media = [];
        for (const reference of references) {
            const localPath = await (0, remoteImage_1.downloadImageToUploads)(`https://maps.googleapis.com/maps/api/place/photo?maxwidth=1000&photo_reference=${reference}&key=${GOOGLE_API_KEY}`);
            if (localPath)
                media.push(localPath);
        }
        if (media.length) {
            await Place.findByIdAndUpdate(place._id, { $set: { media } });
            filled++;
        }
        else {
            console.log(`   ⚠️  downloads failed, left untouched`);
            noPhoto++;
        }
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    console.log('\n═══════════════════════════════════════');
    console.log(`✅ ${APPLY ? 'Filled' : 'Would fill'} : ${filled}`);
    console.log(`⏭️  No match       : ${noMatch}`);
    console.log(`⏭️  No usable photo: ${noPhoto}`);
    console.log('═══════════════════════════════════════\n');
    await mongoose_1.default.disconnect();
};
run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
