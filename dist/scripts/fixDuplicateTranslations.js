"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Fix Duplicate Translations
 * ─────────────────────────────────────────────────────────────────────
 * Finds all documents across all translatable models where a field has
 * { en: X, es: X } (same string in both languages) and re-translates them.
 *
 * Run: npx.cmd ts-node src/scripts/fixDuplicateTranslations.ts
 */
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const category_model_1 = require("../modules/category/category.model");
const place_model_1 = require("../modules/place/place.model");
const business_model_1 = require("../modules/business/business.model");
const offer_model_1 = require("../modules/offer/offer.model");
const map_model_1 = require("../modules/map/map.model");
const awardConfig_model_1 = require("../modules/award/awardConfig.model");
const subscription_plan_model_1 = require("../modules/subscription/subscription-plan.model");
const review_model_1 = require("../modules/review/review.model");
const notification_model_1 = require("../modules/notification/notification.model");
const autoTranslate_1 = require("../utils/autoTranslate");
dotenv_1.default.config();
const DATABASE_URL = process.env.DATABASE_URL;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
/** Returns true when the field is a duplicate { en: X, es: X } */
const isDuplicate = (val) => {
    if (!val || typeof val !== 'object')
        return false;
    const en = (val.en || '').trim();
    const es = (val.es || '').trim();
    return !!(en && es && en === es);
};
/** Re-translate a duplicate field */
async function fixField(val) {
    if (!isDuplicate(val))
        return null;
    await sleep(200);
    return await (0, autoTranslate_1.autoTranslateField)(val);
}
let totalFixed = 0;
async function fixModel(label, docs, fields, Model) {
    console.log(`\n--- Fixing ${label} (${docs.length} docs) ---`);
    for (const doc of docs) {
        const updateData = {};
        for (const field of fields) {
            const nested = field.split('.');
            const val = nested.reduce((obj, key) => obj === null || obj === void 0 ? void 0 : obj[key], doc);
            const fixed = await fixField(val);
            if (fixed)
                updateData[field] = fixed;
        }
        if (Object.keys(updateData).length > 0) {
            await Model.updateOne({ _id: doc._id }, updateData);
            totalFixed++;
            const sample = Object.values(updateData)[0];
            console.log(`  Fixed [${doc._id}] — EN: "${(sample.en || '').slice(0, 40)}" | ES: "${(sample.es || '').slice(0, 40)}"`);
        }
    }
}
async function main() {
    if (!DATABASE_URL) {
        console.error('DATABASE_URL is missing.');
        process.exit(1);
    }
    console.log('Connecting to database...');
    await mongoose_1.default.connect(DATABASE_URL);
    console.log('Connected! Scanning for en===es duplicates...\n');
    try {
        await fixModel('Categories', await category_model_1.Category.find({}), ['name'], category_model_1.Category);
        await fixModel('Maps', await map_model_1.Map.find({}), ['name', 'description'], map_model_1.Map);
        await fixModel('Businesses', await business_model_1.Business.find({}), ['name', 'description'], business_model_1.Business);
        await fixModel('Offers', await offer_model_1.Offer.find({}), ['title', 'description', 'buttonLabel'], offer_model_1.Offer);
        await fixModel('AwardConfigs', await awardConfig_model_1.AwardConfig.find({}), ['title', 'description'], awardConfig_model_1.AwardConfig);
        await fixModel('SubscriptionPlans', await subscription_plan_model_1.SubscriptionPlan.find({}), ['name', 'description'], subscription_plan_model_1.SubscriptionPlan);
        await fixModel('Places', await place_model_1.Place.find({}), ['name', 'description', 'access', 'entryCost', 'difficulty', 'hikeTime', 'atmosphere', 'accessibility.notes', 'recommendations.tips'], place_model_1.Place);
        await fixModel('Reviews', await review_model_1.Review.find({}), ['review'], review_model_1.Review);
        await fixModel('Notifications', await notification_model_1.Notification.find({}), ['title', 'content', 'actionText'], notification_model_1.Notification);
        console.log(`\n✅ Done! Fixed ${totalFixed} duplicate translation fields.`);
    }
    catch (err) {
        console.error('Error:', err);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('Database disconnected.');
    }
}
main();
