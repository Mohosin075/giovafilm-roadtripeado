"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const place_model_1 = require("../modules/place/place.model");
const map_model_1 = require("../modules/map/map.model");
dotenv_1.default.config();
const DATABASE_URL = process.env.DATABASE_URL;
async function findDonBistro() {
    if (!DATABASE_URL) {
        console.error('DATABASE_URL is not defined in .env');
        return;
    }
    try {
        await mongoose_1.default.connect(DATABASE_URL);
        console.log('Connected to database');
        // Force load models to ensure registration
        const mapModelName = map_model_1.Map.modelName;
        console.log('Registered Model:', mapModelName);
        // Find place with name "Don Bistro" or containing it
        const places = await place_model_1.Place.find({ name: /Don Bistro/i }).populate('map');
        console.log(`Found ${places.length} places matching 'Don Bistro':`);
        for (const place of places) {
            console.log('-----------------------------');
            console.log(`ID: ${place._id}`);
            console.log(`Name: ${place.name}`);
            console.log(`Type: ${place.type}`);
            console.log(`Address: ${place.address}`);
            console.log(`Map: ${place.map ? place.map.name + ' (' + place.map._id + ')' : 'None'}`);
            console.log(`Map Status: ${place.map ? place.map.status : 'N/A'}`);
            console.log(`Map isPaid: ${place.map ? place.map.isPaid : 'N/A'}`);
            console.log(`Place Status/Details:`, {
            // any custom status if exists in schema
            });
        }
        await mongoose_1.default.disconnect();
    }
    catch (error) {
        console.error('Error:', error);
    }
}
findDonBistro();
