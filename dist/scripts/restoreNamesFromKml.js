"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const DATABASE_URL = process.env.DATABASE_URL;
const APPLY_CHANGES = process.argv.includes('--apply');
function parseKmlFile(filePath) {
    if (!fs_1.default.existsSync(filePath)) {
        console.error('KML file not found at:', filePath);
        return [];
    }
    const content = fs_1.default.readFileSync(filePath, 'utf-8');
    const placemarks = [];
    const placemarkBlocks = content.split('</Placemark>');
    for (const block of placemarkBlocks) {
        const nameMatch = block.match(/<name>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/name>/i);
        const coordMatch = block.match(/<coordinates>\s*([\d.-]+)\s*,\s*([\d.-]+)/i);
        if (nameMatch && coordMatch) {
            const rawName = nameMatch[1].trim();
            const lng = parseFloat(coordMatch[1]);
            const lat = parseFloat(coordMatch[2]);
            // Ignore generic KML category headers
            if (rawName &&
                !rawName.startsWith('<![CDATA[') &&
                !rawName.includes('Roadtripeado Maps') &&
                !rawName.includes('Ofertas de Roadtripeado') &&
                !rawName.includes('Playas & Rios') &&
                !rawName.includes('Restaurantes y Heladerias') &&
                !rawName.includes('Faros | Castillos')) {
                placemarks.push({ name: rawName, lng, lat });
            }
        }
    }
    return placemarks;
}
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
async function main() {
    var _a, _b, _c;
    if (!DATABASE_URL) {
        console.error('DATABASE_URL is missing in .env');
        process.exit(1);
    }
    const kmlPath = path_1.default.join(__dirname, '../../Roadtripeado Maps 1.0 🇵🇷.kml');
    const kmlPlacemarks = parseKmlFile(kmlPath);
    console.log(`Loaded ${kmlPlacemarks.length} valid placemarks from KML file.\n`);
    await mongoose_1.default.connect(DATABASE_URL);
    console.log('Connected to MongoDB.\n');
    const Place = mongoose_1.default.model('Place', new mongoose_1.default.Schema({}, { strict: false }), 'places');
    const places = await Place.find({});
    console.log(`Scanning ${places.length} Places in database...\n`);
    let matchedCount = 0;
    let updatedCount = 0;
    console.log(APPLY_CHANGES ? '=== APPLY MODE (Updating DB) ===\n' : '=== DRY RUN MODE (No DB changes will be made) ===\n');
    for (const doc of places) {
        let bestMatch = null;
        let minDistance = Infinity;
        const dbCoords = (_a = doc.location) === null || _a === void 0 ? void 0 : _a.coordinates; // [lng, lat]
        const dbEn = ((_b = doc.name) === null || _b === void 0 ? void 0 : _b.en) || '';
        const dbEs = ((_c = doc.name) === null || _c === void 0 ? void 0 : _c.es) || '';
        if (Array.isArray(dbCoords) && dbCoords.length >= 2) {
            const [dbLng, dbLat] = dbCoords;
            for (const p of kmlPlacemarks) {
                const dist = haversineDistanceMeters(dbLat, dbLng, p.lat, p.lng);
                if (dist < minDistance) {
                    minDistance = dist;
                    bestMatch = p;
                }
            }
        }
        // Match within 35 meters for high GPS precision
        if (bestMatch && minDistance <= 35) {
            matchedCount++;
            const kmlName = bestMatch.name;
            // Check if DB name needs updating
            if (dbEn !== kmlName || dbEs !== kmlName) {
                updatedCount++;
                console.log(`[MATCH #${matchedCount}] (${Math.round(minDistance)}m away) [${doc._id}]`);
                console.log(`  Current DB -> EN: "${dbEn}" | ES: "${dbEs}"`);
                console.log(`  Restoring  -> "${kmlName}"`);
                if (APPLY_CHANGES) {
                    await Place.updateOne({ _id: doc._id }, { name: { en: kmlName, es: kmlName } });
                }
            }
        }
    }
    console.log('\n=============================================');
    console.log(`Total Places scanned: ${places.length}`);
    console.log(`Total Places matched within 35m: ${matchedCount}`);
    console.log(`Total Places requiring name restoration: ${updatedCount}`);
    console.log('=============================================');
    if (!APPLY_CHANGES) {
        console.log('\n💡 To apply these changes to the database, run:');
        console.log('   cmd /c npx ts-node src/scripts/restoreNamesFromKml.ts --apply\n');
    }
    else {
        console.log('\n✅ Successfully restored place names in database!\n');
    }
    await mongoose_1.default.disconnect();
}
main().catch(console.error);
