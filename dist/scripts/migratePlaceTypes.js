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
const Place = mongoose_1.default.model('Place', new mongoose_1.default.Schema({}, { strict: false }), 'places');
async function run() {
    try {
        await mongoose_1.default.connect(DATABASE_URL);
        console.log('Connected to database successfully.');
        // Find and update places where type field is missing or null
        const result = await Place.updateMany({
            $or: [
                { type: { $exists: false } },
                { type: null }
            ]
        }, {
            $set: { type: 'Regular' }
        });
        console.log(`Migration Complete:`);
        console.log(`- Matched documents: ${result.matchedCount}`);
        console.log(`- Modified documents: ${result.modifiedCount}`);
        await mongoose_1.default.disconnect();
        console.log('Disconnected from database.');
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}
run();
