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
async function main() {
    if (!DATABASE_URL) {
        console.error('DATABASE_URL is not defined in .env');
        process.exit(1);
    }
    await mongoose_1.default.connect(DATABASE_URL);
    console.log('Connected to database');
    const Place = mongoose_1.default.model('Place', new mongoose_1.default.Schema({}, { strict: false }), 'places');
    const places = await Place.find({}, { name: 1, location: 1 }).limit(30);
    console.log('\n--- Sample 30 Places in Database ---');
    places.forEach((p, i) => {
        var _a, _b;
        console.log(`${i + 1}. [${p._id}] EN: "${(_a = p.name) === null || _a === void 0 ? void 0 : _a.en}" | ES: "${(_b = p.name) === null || _b === void 0 ? void 0 : _b.es}"`);
    });
    // Read KML file and extract names
    const kmlPath = path_1.default.join(__dirname, '../../Roadtripeado Maps 1.0 🇵🇷.kml');
    if (fs_1.default.existsSync(kmlPath)) {
        const kmlContent = fs_1.default.readFileSync(kmlPath, 'utf-8');
        const kmlNames = Array.from(kmlContent.matchAll(/<name>(.*?)<\/name>/g)).map(m => m[1]);
        console.log(`\n--- Found ${kmlNames.length} names in KML file ---`);
        console.log('KML Sample Names:', kmlNames.slice(0, 15));
    }
    else {
        console.log('\nKML file not found at:', kmlPath);
    }
    await mongoose_1.default.disconnect();
}
main().catch(console.error);
