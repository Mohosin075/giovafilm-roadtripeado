"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const place_model_1 = require("../modules/place/place.model");
const offer_model_1 = require("../modules/offer/offer.model");
dotenv_1.default.config();
const DATABASE_URL = process.env.DATABASE_URL;
async function printSample() {
    await mongoose_1.default.connect(DATABASE_URL);
    const place = await place_model_1.Place.findOne({});
    const offer = await offer_model_1.Offer.findOne({});
    console.log('--- Sample Place Doc ---');
    console.log(JSON.stringify(place, null, 2));
    console.log('--- Sample Offer Doc ---');
    console.log(JSON.stringify(offer, null, 2));
    await mongoose_1.default.disconnect();
}
printSample();
