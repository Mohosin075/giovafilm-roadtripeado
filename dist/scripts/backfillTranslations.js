"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const category_model_1 = require("../modules/category/category.model");
const place_model_1 = require("../modules/place/place.model");
const business_model_1 = require("../modules/business/business.model");
const offer_model_1 = require("../modules/offer/offer.model");
const map_model_1 = require("../modules/map/map.model");
const autoTranslate_1 = require("../utils/autoTranslate");
dotenv_1.default.config();
const DATABASE_URL = process.env.DATABASE_URL;
async function backfillTranslations() {
    var _a, _b;
    if (!DATABASE_URL) {
        console.error('DATABASE_URL is missing in environment variables.');
        process.exit(1);
    }
    console.log('Connecting to database for translation backfill...');
    await mongoose_1.default.connect(DATABASE_URL);
    console.log('Connected to Database successfully!');
    try {
        // 1. Backfill Categories
        console.log('\n--- Backfilling Categories ---');
        const categories = await category_model_1.Category.find({});
        for (const cat of categories) {
            if (typeof cat.name === 'string') {
                const i18n = await (0, autoTranslate_1.autoTranslateField)(cat.name, 'es');
                await category_model_1.Category.updateOne({ _id: cat._id }, { name: i18n });
                console.log(`Updated Category [${cat._id}]: "${cat.name}" -> EN: "${i18n.en}"`);
            }
        }
        // 2. Backfill Maps
        console.log('\n--- Backfilling Maps ---');
        const maps = await map_model_1.Map.find({});
        for (const map of maps) {
            const updateData = {};
            if (typeof map.name === 'string') {
                updateData.name = await (0, autoTranslate_1.autoTranslateField)(map.name, 'es');
            }
            if (typeof map.description === 'string') {
                updateData.description = await (0, autoTranslate_1.autoTranslateField)(map.description, 'es');
            }
            if (Object.keys(updateData).length > 0) {
                await map_model_1.Map.updateOne({ _id: map._id }, updateData);
                console.log(`Updated Map [${map._id}]`);
            }
        }
        // 3. Backfill Businesses
        console.log('\n--- Backfilling Businesses ---');
        const businesses = await business_model_1.Business.find({});
        for (const bus of businesses) {
            const updateData = {};
            if (typeof bus.name === 'string') {
                updateData.name = await (0, autoTranslate_1.autoTranslateField)(bus.name, 'es');
            }
            if (typeof bus.description === 'string') {
                updateData.description = await (0, autoTranslate_1.autoTranslateField)(bus.description, 'es');
            }
            if (Object.keys(updateData).length > 0) {
                await business_model_1.Business.updateOne({ _id: bus._id }, updateData);
                console.log(`Updated Business [${bus._id}]`);
            }
        }
        // 4. Backfill Offers
        console.log('\n--- Backfilling Offers ---');
        const offers = await offer_model_1.Offer.find({});
        for (const off of offers) {
            const updateData = {};
            if (typeof off.title === 'string') {
                updateData.title = await (0, autoTranslate_1.autoTranslateField)(off.title, 'es');
            }
            if (typeof off.description === 'string') {
                updateData.description = await (0, autoTranslate_1.autoTranslateField)(off.description, 'es');
            }
            if (typeof off.buttonLabel === 'string') {
                updateData.buttonLabel = await (0, autoTranslate_1.autoTranslateField)(off.buttonLabel, 'es');
            }
            if (Object.keys(updateData).length > 0) {
                await offer_model_1.Offer.updateOne({ _id: off._id }, updateData);
                console.log(`Updated Offer [${off._id}]`);
            }
        }
        // 5. Backfill Places
        console.log('\n--- Backfilling Places ---');
        const places = await place_model_1.Place.find({});
        let placeCount = 0;
        for (const place of places) {
            const updateData = {};
            if (typeof place.name === 'string') {
                updateData.name = await (0, autoTranslate_1.autoTranslateField)(place.name, 'es');
            }
            if (typeof place.description === 'string') {
                updateData.description = await (0, autoTranslate_1.autoTranslateField)(place.description, 'es');
            }
            if (place.access && typeof place.access === 'string') {
                updateData.access = await (0, autoTranslate_1.autoTranslateField)(place.access, 'es');
            }
            if (place.entryCost && typeof place.entryCost === 'string') {
                updateData.entryCost = await (0, autoTranslate_1.autoTranslateField)(place.entryCost, 'es');
            }
            if (place.hikeTime && typeof place.hikeTime === 'string') {
                updateData.hikeTime = await (0, autoTranslate_1.autoTranslateField)(place.hikeTime, 'es');
            }
            if (place.atmosphere && typeof place.atmosphere === 'string') {
                updateData.atmosphere = await (0, autoTranslate_1.autoTranslateField)(place.atmosphere, 'es');
            }
            if (((_a = place.accessibility) === null || _a === void 0 ? void 0 : _a.notes) && typeof place.accessibility.notes === 'string') {
                updateData['accessibility.notes'] = await (0, autoTranslate_1.autoTranslateField)(place.accessibility.notes, 'es');
            }
            if (((_b = place.recommendations) === null || _b === void 0 ? void 0 : _b.tips) && typeof place.recommendations.tips === 'string') {
                updateData['recommendations.tips'] = await (0, autoTranslate_1.autoTranslateField)(place.recommendations.tips, 'es');
            }
            if (Object.keys(updateData).length > 0) {
                await place_model_1.Place.updateOne({ _id: place._id }, updateData);
                placeCount++;
                if (placeCount % 20 === 0) {
                    console.log(`Backfilled ${placeCount} places...`);
                }
            }
        }
        console.log('\n✅ All translations backfilled successfully!');
    }
    catch (error) {
        console.error('Error backfilling translations:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('Database disconnected.');
    }
}
backfillTranslations();
