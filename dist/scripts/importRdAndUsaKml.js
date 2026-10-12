"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const dotenv = __importStar(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fast_xml_parser_1 = require("fast-xml-parser");
const remoteImage_1 = require("../utils/remoteImage");
dotenv.config();
const DATABASE_URL = process.env.DATABASE_URL;
const RD_MAP_ID = new mongoose_1.Types.ObjectId('69e93d53668604cc97522f47');
const USA_MAP_ID = new mongoose_1.Types.ObjectId('69eead79b3674c3b4f6f91c2');
const parser = new fast_xml_parser_1.XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
});
const categoryMapping = {
    'playas y lagunas': 'Playas',
    'playas & rios': 'Playas',
    'playas': 'Playas',
    'rios | cascadas | manantiales': 'Rios',
    'rios | charcos | cascadas': 'Rios',
    'rios': 'Rios',
    'bowling | arcade | game | park': 'Bowling, Arcade, Juegos y Parques',
    'bowling, arcade, game & park': 'Bowling, Arcade, Juegos y Parques',
    'bowling, arcade, juegos y parques': 'Bowling, Arcade, Juegos y Parques',
    'castillos | ruinas | tuneles': 'Faros | Castillos | Ruinas | Tunel | Puentes',
    'fort | ruin | lighthouse | historic sites': 'Faros | Castillos | Ruinas | Tunel | Puentes',
    'faros | castillos | ruinas | tunel | puentes': 'Faros | Castillos | Ruinas | Tunel | Puentes',
    'cuevas | acantilados | petroglifos': 'Cuevas | Acantilados | Petroglifos',
    'tablados, bosques, jardines, paseos y picnics': 'Tablados | Bosques | Jardines',
    'tablados | bosques | jardines': 'Tablados | Bosques | Jardines',
    'kayak | jetski | atv | go kart | caballos | zipline': 'Kayak | Jetski | ATV | Go Kart | Caballos | Zipline',
    'restaurantes': 'Restaurantes',
    'restaurantes y heladerias': 'Restaurantes',
    'museos | experiencias': 'Museos & Experiencias',
    'museos': 'Museos & Experiencias',
    'museos & experiencias': 'Museos & Experiencias',
    "airbnb's": "Airbnb's & Hotel",
    "airbnb's & hotel": "Airbnb's & Hotel",
};
const businessCategories = [
    'Restaurantes',
    'Bowling, Arcade, Juegos y Parques',
    'Kayak | Jetski | ATV | Go Kart | Caballos | Zipline',
    "Airbnb's & Hotel",
];
const DEFAULT_OPERATING_HOURS = {
    Monday: { open: '09:00', close: '18:00', closed: false },
    Tuesday: { open: '09:00', close: '18:00', closed: false },
    Wednesday: { open: '09:00', close: '18:00', closed: false },
    Thursday: { open: '09:00', close: '18:00', closed: false },
    Friday: { open: '09:00', close: '18:00', closed: false },
    Saturday: { open: '10:00', close: '16:00', closed: false },
    Sunday: { open: '10:00', close: '16:00', closed: true },
};
function extractImages(rawDesc, pm) {
    var _a;
    const images = [];
    if (rawDesc) {
        const imgRegex = /src="([^"]+)"/g;
        let match;
        while ((match = imgRegex.exec(rawDesc)) !== null) {
            if (!images.includes(match[1]))
                images.push(match[1]);
        }
    }
    if ((_a = pm.ExtendedData) === null || _a === void 0 ? void 0 : _a.Data) {
        const dataFields = Array.isArray(pm.ExtendedData.Data) ? pm.ExtendedData.Data : [pm.ExtendedData.Data];
        const mediaLinksField = dataFields.find((f) => f['@_name'] === 'gx_media_links');
        if (mediaLinksField === null || mediaLinksField === void 0 ? void 0 : mediaLinksField.value) {
            const links = String(mediaLinksField.value).split(' ').filter((l) => l.startsWith('http'));
            links.forEach((l) => {
                if (!images.includes(l))
                    images.push(l);
            });
        }
    }
    return images;
}
function cleanHtml(html) {
    if (!html)
        return '';
    return html
        .replace(/<img[^>]*>/g, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();
}
function extractInstagram(rawDesc) {
    if (!rawDesc)
        return '';
    const match = rawDesc.match(/https?:\/\/(?:www\.)?instagram\.com\/[^\s"'>]+/i);
    return match ? match[0] : '';
}
function extractWebsite(rawDesc) {
    if (!rawDesc)
        return '';
    const lines = rawDesc.split(/<br\s*\/?>|\n/);
    for (const line of lines) {
        if (line.includes('instagram.com') || line.includes('google.com'))
            continue;
        const match = line.match(/(?:https?:\/\/|www\.)[^\s"'>]+/i);
        if (match) {
            let url = match[0];
            if (url.startsWith('www.'))
                url = 'https://' + url;
            return url;
        }
    }
    return '';
}
async function runImport() {
    var _a, _b;
    if (!DATABASE_URL) {
        console.error('DATABASE_URL is not defined in .env');
        process.exit(1);
    }
    await mongoose_1.default.connect(DATABASE_URL);
    console.log('Connected to MongoDB successfully.');
    const categoriesCollection = mongoose_1.default.connection.collection('categories');
    const placesCollection = mongoose_1.default.connection.collection('places');
    const mapsCollection = mongoose_1.default.connection.collection('maps');
    // Ensure "Airbnb's & Hotel" category exists
    let airbnbCat = await categoriesCollection.findOne({
        $or: [{ 'name.es': "Airbnb's & Hotel" }, { 'name.es': "Airbnb's" }],
    });
    if (!airbnbCat) {
        const insertRes = await categoriesCollection.insertOne({
            name: { es: "Airbnb's & Hotel", en: "Airbnb's & Hotel" },
            color: '#e91e63',
            icon: '🏨',
            status: 'Active',
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        airbnbCat = await categoriesCollection.findOne({ _id: insertRes.insertedId });
        console.log(`Created new category: Airbnb's & Hotel (${airbnbCat === null || airbnbCat === void 0 ? void 0 : airbnbCat._id})`);
    }
    else {
        console.log(`Existing Airbnb category found: ${airbnbCat._id}`);
    }
    // Load all categories into lookup map
    const allCategories = await categoriesCollection.find({}).toArray();
    const catLookup = new Map();
    for (const cat of allCategories) {
        const esName = ((_a = cat.name) === null || _a === void 0 ? void 0 : _a.es) || (typeof cat.name === 'string' ? cat.name : '');
        if (esName) {
            catLookup.set(esName.toLowerCase(), cat._id);
        }
    }
    // Files to process
    const filesToImport = [
        {
            file: 'Roadtripeado Maps RD 🇩🇴.kml',
            mapId: RD_MAP_ID,
            country: 'Dominican Republic',
        },
        {
            file: 'Roadtripeado Maps USA 🇺🇸.kml',
            mapId: USA_MAP_ID,
            country: 'United States',
        },
    ];
    const createdPlaceIdsByMap = {
        [RD_MAP_ID.toString()]: [],
        [USA_MAP_ID.toString()]: [],
    };
    const existingPlaces = await placesCollection.find({}).toArray();
    for (const { file, mapId, country } of filesToImport) {
        console.log(`\n======================================================`);
        console.log(`Importing Places from: ${file} (${country})`);
        console.log(`======================================================`);
        const filePath = path_1.default.join(__dirname, '../../kml', file);
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        const parsed = parser.parse(content);
        const doc = parsed.kml.Document;
        const folders = Array.isArray(doc.Folder) ? doc.Folder : [doc.Folder];
        let importedCount = 0;
        let skippedCount = 0;
        for (const folder of folders) {
            const folderName = folder.name;
            const normalizedFolder = folderName.trim().toLowerCase();
            const mappedTargetName = categoryMapping[normalizedFolder];
            if (!mappedTargetName) {
                console.error(`Unknown folder category: ${folderName}`);
                continue;
            }
            const categoryId = catLookup.get(mappedTargetName.toLowerCase());
            if (!categoryId) {
                console.error(`Category ID not found for: ${mappedTargetName}`);
                continue;
            }
            const isBusiness = businessCategories.includes(mappedTargetName);
            const placemarks = folder.Placemark ? (Array.isArray(folder.Placemark) ? folder.Placemark : [folder.Placemark]) : [];
            for (const pm of placemarks) {
                const name = pm.name ? String(pm.name).trim() : 'Unnamed Place';
                const coordsStr = (_b = pm.Point) === null || _b === void 0 ? void 0 : _b.coordinates;
                if (!coordsStr)
                    continue;
                const [lon, lat] = coordsStr.split(',').map(Number);
                // Check duplicate
                const isDuplicate = existingPlaces.some(ep => {
                    var _a, _b, _c;
                    const epCoords = (_a = ep.location) === null || _a === void 0 ? void 0 : _a.coordinates;
                    if (Array.isArray(epCoords) && epCoords.length >= 2) {
                        const distLon = Math.abs(epCoords[0] - lon);
                        const distLat = Math.abs(epCoords[1] - lat);
                        if (distLon < 0.0001 && distLat < 0.0001)
                            return true;
                    }
                    const epName = ((_b = ep.name) === null || _b === void 0 ? void 0 : _b.es) || ((_c = ep.name) === null || _c === void 0 ? void 0 : _c.en) || ep.name;
                    if (epName && typeof epName === 'string' && epName.toLowerCase() === name.toLowerCase()) {
                        if (ep.country === country)
                            return true;
                    }
                    return false;
                });
                if (isDuplicate) {
                    skippedCount++;
                    continue;
                }
                const rawDesc = pm.description || '';
                const cleanDesc = cleanHtml(rawDesc) || 'No description available';
                const media = extractImages(rawDesc, pm);
                const instagram = extractInstagram(rawDesc);
                const website = extractWebsite(rawDesc);
                const placeDoc = {
                    name: {
                        es: name,
                        en: name,
                    },
                    map: mapId,
                    category: categoryId,
                    country: country,
                    address: country,
                    location: {
                        type: 'Point',
                        coordinates: [lon, lat],
                    },
                    description: {
                        es: cleanDesc,
                        en: cleanDesc,
                    },
                    media,
                    menuImages: [],
                    type: isBusiness ? 'Business' : 'Regular',
                    status: 'Published',
                    difficulty: {
                        es: 'Fácil',
                        en: 'Easy',
                    },
                    entryCost: {
                        es: 'Free',
                        en: 'Free',
                    },
                    rating: 0,
                    totalReview: 0,
                    openCount: 0,
                    services: [],
                    accessibility: {
                        features: [],
                        notes: '',
                    },
                    recommendations: {
                        tips: '',
                    },
                    access: '',
                    atmosphere: '',
                    schedules: '',
                    hikeTime: '',
                    phone: '',
                    website,
                    instagram,
                    operatingHours: isBusiness ? DEFAULT_OPERATING_HOURS : null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                const result = await placesCollection.insertOne(placeDoc);
                const insertedId = result.insertedId;
                createdPlaceIdsByMap[mapId.toString()].push(insertedId);
                // Add to in-memory existing list to prevent duplicates within same batch
                existingPlaces.push({ ...placeDoc, _id: insertedId });
                importedCount++;
            }
        }
        console.log(`Finished ${country}:`);
        console.log(` - Successfully imported: ${importedCount} places`);
        console.log(` - Skipped (already existed): ${skippedCount} places`);
    }
    // Update Map records with places
    console.log('\n--- Synchronizing Maps ---');
    for (const mapId of [RD_MAP_ID, USA_MAP_ID]) {
        const allPlacesForMap = await placesCollection.find({ map: mapId }, { projection: { _id: 1 } }).toArray();
        const placeIds = allPlacesForMap.map(p => p._id);
        await mapsCollection.updateOne({ _id: mapId }, { $set: { places: placeIds } });
        console.log(`Map [${mapId}] updated with ${placeIds.length} places.`);
    }
    // Localize Remote Images
    console.log('\n======================================================');
    console.log('Localizing Remote Images to /uploads/images/...');
    console.log('======================================================');
    const placesWithRemoteMedia = await placesCollection
        .find({
        $or: [
            { map: RD_MAP_ID },
            { map: USA_MAP_ID },
        ],
        media: { $elemMatch: { $regex: '^http' } },
    })
        .toArray();
    console.log(`Found ${placesWithRemoteMedia.length} places with remote media to localize.`);
    let localizedImagesCount = 0;
    let failedImagesCount = 0;
    // Download with concurrency limit of 5
    const CONCURRENCY = 5;
    for (let i = 0; i < placesWithRemoteMedia.length; i += CONCURRENCY) {
        const batch = placesWithRemoteMedia.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(async (place) => {
            const nextMedia = [];
            let hasChanges = false;
            for (const url of place.media) {
                if ((0, remoteImage_1.isRemoteManagedImage)(url)) {
                    const localPath = await (0, remoteImage_1.downloadImageToUploads)(url);
                    if (localPath) {
                        nextMedia.push(localPath);
                        localizedImagesCount++;
                        hasChanges = true;
                    }
                    else {
                        nextMedia.push(url);
                        failedImagesCount++;
                    }
                }
                else {
                    nextMedia.push(url);
                }
            }
            if (hasChanges) {
                await placesCollection.updateOne({ _id: place._id }, { $set: { media: nextMedia, updatedAt: new Date() } });
            }
        }));
        const processed = Math.min(i + CONCURRENCY, placesWithRemoteMedia.length);
        if (processed % 25 === 0 || processed === placesWithRemoteMedia.length) {
            console.log(`Progress: ${processed} / ${placesWithRemoteMedia.length} places processed... (Localized: ${localizedImagesCount}, Failed/Kept: ${failedImagesCount})`);
        }
    }
    console.log('\n======================================================');
    console.log('SUMMARY');
    console.log('======================================================');
    const finalRDCount = await placesCollection.countDocuments({ map: RD_MAP_ID });
    const finalUSACount = await placesCollection.countDocuments({ map: USA_MAP_ID });
    const finalPRCount = await placesCollection.countDocuments({ country: 'Puerto Rico' });
    const totalPlaces = await placesCollection.countDocuments({});
    console.log(`Puerto Rico Places:        ${finalPRCount}`);
    console.log(`Dominican Republic Places:  ${finalRDCount}`);
    console.log(`United States Places:      ${finalUSACount}`);
    console.log(`Total Places in Database:  ${totalPlaces}`);
    console.log(`Images Localized:          ${localizedImagesCount}`);
    console.log('======================================================');
    await mongoose_1.default.disconnect();
    console.log('Disconnected from MongoDB.');
}
runImport().catch((err) => {
    console.error('Fatal error during import:', err);
    process.exit(1);
});
