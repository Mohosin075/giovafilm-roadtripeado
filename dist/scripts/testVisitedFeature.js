"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const user_model_1 = require("../modules/user/user.model");
const place_model_1 = require("../modules/place/place.model");
const visited_service_1 = require("../modules/visited/visited.service");
dotenv_1.default.config();
const DATABASE_URL = process.env.DATABASE_URL;
async function runManualTest() {
    var _a, _b, _c, _d;
    if (!DATABASE_URL) {
        console.error('DATABASE_URL is not defined in .env');
        return;
    }
    console.log('Connecting to MongoDB...');
    await mongoose_1.default.connect(DATABASE_URL);
    console.log('MongoDB connected successfully.\n');
    try {
        // 1. Pick a test user
        const user = await user_model_1.User.findOne({ status: 'active' }) || await user_model_1.User.findOne({});
        if (!user) {
            console.log('No user found in database to test.');
            return;
        }
        const userId = user._id.toString();
        console.log(`Test User: ${user.name || user.email} (ID: ${userId})`);
        // 2. Pick a test place
        const place = await place_model_1.Place.findOne({ status: 'Published' }) || await place_model_1.Place.findOne({});
        if (!place) {
            console.log('No place found in database to test.');
            return;
        }
        const placeId = place._id.toString();
        console.log(`Test Place: ${typeof place.name === 'object' ? place.name.en || place.name.es : place.name} (ID: ${placeId})\n`);
        // Initial count
        const initialCountRes = await visited_service_1.VisitedService.getVisitedCount(userId);
        console.log(`[Step 1] Initial Visited Count: ${initialCountRes.visitedPlacesCount}`);
        // 3. Mark as Visited (Toggle 1)
        console.log('\n[Step 2] Marking place as Visited (Toggle 1)...');
        const toggle1 = await visited_service_1.VisitedService.toggleVisited(userId, { placeId });
        console.log('Result:', toggle1);
        // Verify User in DB
        const userAfterMark = await user_model_1.User.findById(userId).select('visitedPlaces visitedPlacesCount');
        console.log('User DB State -> visitedPlacesCount:', userAfterMark === null || userAfterMark === void 0 ? void 0 : userAfterMark.visitedPlacesCount);
        console.log('User DB State -> visitedPlaces includes placeId?', (_a = userAfterMark === null || userAfterMark === void 0 ? void 0 : userAfterMark.visitedPlaces) === null || _a === void 0 ? void 0 : _a.map(id => id.toString()).includes(placeId));
        // 4. Fetch My Visited Places
        console.log('\n[Step 3] Fetching My Visited Places (List)...');
        const myPlaces = await visited_service_1.VisitedService.getMyVisitedPlaces(userId, { page: 1, limit: 5 });
        console.log(`Total Visited Places in List: ${myPlaces.meta.total}`);
        const foundInList = myPlaces.data.find((item) => { var _a, _b, _c, _d; return ((_b = (_a = item.place) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString()) === placeId || ((_d = (_c = item.business) === null || _c === void 0 ? void 0 : _c._id) === null || _d === void 0 ? void 0 : _d.toString()) === placeId; });
        console.log('Place successfully returned in list?', !!foundInList);
        if (foundInList) {
            console.log('Place Name in List:', ((_b = foundInList.place) === null || _b === void 0 ? void 0 : _b.name) || ((_c = foundInList.business) === null || _c === void 0 ? void 0 : _c.name));
            console.log('isVisited flag:', foundInList.isVisited);
        }
        // 5. Unmark (Toggle 2)
        console.log('\n[Step 4] Unmarking place as Visited (Toggle 2)...');
        const toggle2 = await visited_service_1.VisitedService.toggleVisited(userId, { placeId });
        console.log('Result:', toggle2);
        // Verify User in DB after unmark
        const userAfterUnmark = await user_model_1.User.findById(userId).select('visitedPlaces visitedPlacesCount');
        console.log('User DB State -> visitedPlacesCount:', userAfterUnmark === null || userAfterUnmark === void 0 ? void 0 : userAfterUnmark.visitedPlacesCount);
        console.log('User DB State -> visitedPlaces still includes placeId?', (_d = userAfterUnmark === null || userAfterUnmark === void 0 ? void 0 : userAfterUnmark.visitedPlaces) === null || _d === void 0 ? void 0 : _d.map(id => id.toString()).includes(placeId));
        console.log('\nALL CHECKS PASSED SUCCESSFULLY!');
    }
    catch (error) {
        console.error('Test failed with error:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('\nMongoDB disconnected.');
    }
}
runManualTest();
