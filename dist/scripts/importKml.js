"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const fast_xml_parser_1 = require("fast-xml-parser");
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const DATABASE_URL = process.env.DATABASE_URL;
const KML_FILE_PATH = path_1.default.join(__dirname, '../../Roadtripeado Maps 1.0 🇵🇷.kml');
const PUERTO_RICO_MAP_ID = '69e912c3668604cc97522d2a';
// Define schemas locally to avoid import issues in script
const PlaceSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    map: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Map', required: true },
    category: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Category', required: true },
    country: { type: String, required: true },
    description: { type: String, required: true },
    media: { type: [String], default: [] },
    address: { type: String, required: true },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point', required: true },
        coordinates: { type: [Number], required: true },
    },
    status: { type: String, enum: ['Draft', 'Published'], default: 'Published' },
    difficulty: { type: String, default: 'Easy' },
}, { timestamps: true });
const CategorySchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    color: { type: String, required: true },
    status: { type: String, default: 'Active' },
}, { timestamps: true });
const MapSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    places: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Place' }],
}, { timestamps: true });
const Place = mongoose_1.default.model('Place', PlaceSchema);
const Category = mongoose_1.default.model('Category', CategorySchema);
const Map = mongoose_1.default.model('Map', MapSchema);
function cleanHtml(html) {
    if (!html)
        return '';
    return html
        .replace(/<img[^>]*>/g, '') // Remove img tags
        .replace(/<br\s*\/?>/gi, '\n') // Replace br with newline
        .replace(/<[^>]+>/g, '') // Remove all other tags
        .replace(/&nbsp;/g, ' ')
        .trim();
}
function extractImages(html) {
    if (!html)
        return [];
    const images = [];
    const imgRegex = /src="([^"]+)"/g;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
        images.push(match[1]);
    }
    return images;
}
async function importKml() {
    var _a;
    if (!DATABASE_URL) {
        console.error('DATABASE_URL not found');
        return;
    }
    try {
        const kmlData = fs_1.default.readFileSync(KML_FILE_PATH, 'utf-8');
        const parser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
        });
        const result = parser.parse(kmlData);
        await mongoose_1.default.connect(DATABASE_URL);
        console.log('Connected to DB');
        const prMap = await Map.findById(PUERTO_RICO_MAP_ID);
        if (!prMap) {
            console.error('Puerto Rico Map not found');
            return;
        }
        const folders = result.kml.Document.Folder;
        const foldersArray = Array.isArray(folders) ? folders : [folders];
        let totalImported = 0;
        for (const folder of foldersArray) {
            const categoryName = folder.name;
            console.log(`Processing Folder: ${categoryName}`);
            let category = await Category.findOne({ name: categoryName });
            if (!category) {
                category = await Category.create({
                    name: categoryName,
                    color: '#007bff', // Default blue
                    status: 'Active'
                });
                console.log(`Created new Category: ${categoryName}`);
            }
            const placemarks = folder.Placemark;
            if (!placemarks)
                continue;
            const placemarksArray = Array.isArray(placemarks) ? placemarks : [placemarks];
            for (const pm of placemarksArray) {
                const name = pm.name || 'Unnamed Place';
                const rawDesc = pm.description || '';
                const desc = cleanHtml(rawDesc);
                const media = extractImages(rawDesc);
                // Handle ExtendedData if present for media links
                if (pm.ExtendedData && pm.ExtendedData.Data) {
                    const dataFields = Array.isArray(pm.ExtendedData.Data) ? pm.ExtendedData.Data : [pm.ExtendedData.Data];
                    const mediaLinksField = dataFields.find((f) => f["@_name"] === "gx_media_links");
                    if (mediaLinksField && mediaLinksField.value) {
                        const links = mediaLinksField.value.split(' ').filter((l) => l.startsWith('http'));
                        links.forEach((l) => {
                            if (!media.includes(l))
                                media.push(l);
                        });
                    }
                }
                const coordsStr = (_a = pm.Point) === null || _a === void 0 ? void 0 : _a.coordinates;
                if (!coordsStr)
                    continue;
                const [lon, lat] = coordsStr.split(',').map(Number);
                // Check for duplicates
                const existingPlace = await Place.findOne({
                    name: name,
                    'location.coordinates': [lon, lat]
                });
                if (existingPlace) {
                    console.log(`Skipping existing place: ${name}`);
                    continue;
                }
                const newPlace = await Place.create({
                    name,
                    map: prMap._id,
                    category: category._id,
                    country: 'Puerto Rico',
                    description: desc || 'No description available',
                    media,
                    address: 'Puerto Rico', // Placeholder address
                    location: {
                        type: 'Point',
                        coordinates: [lon, lat]
                    },
                    status: 'Published',
                    difficulty: 'Easy'
                });
                // Add to map
                await Map.findByIdAndUpdate(PUERTO_RICO_MAP_ID, {
                    $addToSet: { places: newPlace._id }
                });
                totalImported++;
                if (totalImported % 50 === 0) {
                    console.log(`Imported ${totalImported} places...`);
                }
            }
        }
        console.log(`Finished! Total imported: ${totalImported}`);
        await mongoose_1.default.disconnect();
    }
    catch (error) {
        console.error('Error during import:', error);
    }
}
importKml();
