"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const DATABASE_URL = process.env.DATABASE_URL;
async function checkData() {
    if (!DATABASE_URL) {
        console.error('DATABASE_URL is not defined in .env');
        return;
    }
    try {
        await mongoose_1.default.connect(DATABASE_URL);
        console.log('Connected to database');
        const Map = mongoose_1.default.model('Map', new mongoose_1.default.Schema({}, { strict: false }), 'maps');
        const Category = mongoose_1.default.model('Category', new mongoose_1.default.Schema({}, { strict: false }), 'categories');
        const maps = await Map.find({}, { name: 1 });
        const categories = await Category.find({}, { name: 1 });
        console.log('--- Maps ---');
        console.log(JSON.stringify(maps, null, 2));
        console.log('--- Categories ---');
        console.log(JSON.stringify(categories, null, 2));
        await mongoose_1.default.disconnect();
    }
    catch (error) {
        console.error('Error:', error);
    }
}
checkData();
