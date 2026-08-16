"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const map_model_1 = require("../modules/map/map.model");
const place_model_1 = require("../modules/place/place.model");
dotenv_1.default.config();
const DATABASE_URL = process.env.DATABASE_URL;
async function checkMapPlaces() {
    await mongoose_1.default.connect(DATABASE_URL);
    const maps = await map_model_1.Map.find({});
    for (const m of maps) {
        const count = await place_model_1.Place.countDocuments({ map: m._id });
        const regular = await place_model_1.Place.countDocuments({ map: m._id, type: 'Regular' });
        const business = await place_model_1.Place.countDocuments({ map: m._id, type: 'Business' });
        console.log(`Map: ${m.name} (${m._id.toString()}) - Total: ${count}, Regular: ${regular}, Business: ${business}`);
    }
    await mongoose_1.default.disconnect();
}
checkMapPlaces();
