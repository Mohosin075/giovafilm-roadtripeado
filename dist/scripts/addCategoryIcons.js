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
const Category = mongoose_1.default.model('Category', new mongoose_1.default.Schema({}, { strict: false }), 'categories');
function pickIcon(name) {
    if (!name)
        return '📍';
    const s = name.toLowerCase();
    if (s.includes('rest') || s.includes('helader') || s.includes('restaurant'))
        return '🍽️';
    if (s.includes('playa') || s.includes('beach') || s.includes('rio') || s.includes('river'))
        return '🏖️';
    if (s.includes('muse') || s.includes('experienc'))
        return '🏛️';
    if (s.includes('cueva') || s.includes('cave') || s.includes('acantil'))
        return '🪨';
    if (s.includes('bowling') || s.includes('arcade') || s.includes('game'))
        return '🎳';
    if (s.includes('kayak') || s.includes('jetski') || s.includes('atv') || s.includes('zipline'))
        return '🚤';
    if (s.includes('hotel') || s.includes("airbnb") || s.includes('lodg'))
        return '🏨';
    if (s.includes('oferta') || s.includes('offer') || s.includes('deal'))
        return '🎫';
    if (s.includes('business'))
        return '💼';
    if (s.includes('tablado') || s.includes('bosque') || s.includes('jardin'))
        return '🌳';
    return '📍';
}
async function run() {
    try {
        await mongoose_1.default.connect(DATABASE_URL);
        console.log('Connected to database');
        const missing = await Category.find({
            $or: [
                { icon: { $exists: false } },
                { icon: null },
                { icon: '' },
            ],
        });
        if (!missing.length) {
            console.log('No categories without icons found.');
            await mongoose_1.default.disconnect();
            return;
        }
        console.log(`Found ${missing.length} categories without icons. Updating...`);
        for (const cat of missing) {
            const name = cat.name || '';
            const icon = pickIcon(name);
            await Category.updateOne({ _id: cat._id }, { $set: { icon } });
            console.log(`Updated ${name} -> ${icon}`);
        }
        await mongoose_1.default.disconnect();
        console.log('Done, disconnected.');
    }
    catch (err) {
        console.error('Error updating categories:', err);
        try {
            await mongoose_1.default.disconnect();
        }
        catch (_) { }
        process.exit(1);
    }
}
run();
