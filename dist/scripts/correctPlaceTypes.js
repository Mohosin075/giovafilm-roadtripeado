"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const place_model_1 = require("../modules/place/place.model");
const category_model_1 = require("../modules/category/category.model");
dotenv_1.default.config();
const DATABASE_URL = process.env.DATABASE_URL;
async function correctPlaceTypes() {
    var _a;
    await mongoose_1.default.connect(DATABASE_URL);
    // Register Category model
    const categoryModelName = category_model_1.Category.modelName;
    console.log(`Registered model: ${categoryModelName}`);
    const places = await place_model_1.Place.find({}).populate('category');
    let regularCount = 0;
    let businessCount = 0;
    for (const place of places) {
        const catName = ((_a = place.category) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown';
        // Define which categories should be treated as Business
        const isBusinessCategory = [
            'restaurant',
            'Business',
            'Kayak | Jetski | ATV | Go Kart | Caballos | Zipline',
            'Bowling, Arcade, Game & Park'
        ].includes(catName);
        const targetType = isBusinessCategory ? 'Business' : 'Regular';
        if (place.type !== targetType) {
            await place_model_1.Place.findByIdAndUpdate(place._id, { type: targetType });
            if (targetType === 'Regular') {
                regularCount++;
            }
            else {
                businessCount++;
            }
        }
    }
    console.log(`Updated ${regularCount} places to 'Regular' and ${businessCount} places to 'Business'.`);
    // Print final counts
    const finalTotal = await place_model_1.Place.countDocuments();
    const finalBusiness = await place_model_1.Place.countDocuments({ type: 'Business' });
    const finalRegular = await place_model_1.Place.countDocuments({ type: 'Regular' });
    console.log({ finalTotal, finalBusiness, finalRegular });
    await mongoose_1.default.disconnect();
}
correctPlaceTypes();
