"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('DATABASE_URL is not defined in .env');
    process.exit(1);
}
async function resetMapReviews() {
    try {
        await mongoose_1.default.connect(DATABASE_URL);
        console.log('Connected to database successfully.');
        const db = mongoose_1.default.connection.db;
        if (!db) {
            throw new Error('Database connection not established properly');
        }
        console.log('\n--- Checking existing Maps ---');
        const allMaps = await db.collection('maps').find({}).toArray();
        console.log(`Total maps found: ${allMaps.length}`);
        allMaps.forEach((m) => {
            console.log(`- Map: "${m.name}" | current rating: ${m.rating} | totalReview: ${m.totalReview}`);
        });
        console.log('\n--- Resetting rating and totalReview to 0 for all Maps ---');
        const updateResult = await db.collection('maps').updateMany({}, { $set: { rating: 0, totalReview: 0 } });
        console.log(`Updated ${updateResult.modifiedCount} maps.`);
        const updatedMaps = await db.collection('maps').find({}).toArray();
        console.log('\n--- Verification after reset ---');
        updatedMaps.forEach((m) => {
            console.log(`- Map: "${m.name}" | new rating: ${m.rating} | totalReview: ${m.totalReview}`);
        });
        await mongoose_1.default.disconnect();
        console.log('\nReset complete. Disconnected from database.');
    }
    catch (error) {
        console.error('Reset failed:', error);
        process.exit(1);
    }
}
resetMapReviews();
