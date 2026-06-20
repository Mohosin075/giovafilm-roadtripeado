"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwardServices = void 0;
const mongoose_1 = require("mongoose");
const award_model_1 = require("./award.model");
const user_model_1 = require("../user/user.model");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const http_status_codes_1 = require("http-status-codes");
const getMyAwards = async (userId) => {
    const user = await user_model_1.User.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found');
    }
    const existingAwards = await award_model_1.Award.find({ userId });
    const defaultAwards = [
        {
            type: 'PDF Itinerary',
            target: 500,
            progress: user.points || 0,
            isUnlocked: (user.points || 0) >= 500,
        },
        {
            type: 'Free Map',
            target: 1000,
            progress: user.points || 0,
            isUnlocked: (user.points || 0) >= 1000,
        },
        {
            type: 'Gourmet Guide',
            target: 2000,
            progress: 0,
            isUnlocked: false,
        },
        {
            type: 'Top Reviewer',
            target: 1000,
            progress: 0,
            isUnlocked: false,
        },
        {
            type: 'Trail Master',
            target: 500,
            progress: 0,
            isUnlocked: false,
        },
        {
            type: 'History Buff',
            target: 1500,
            progress: 0,
            isUnlocked: false,
        },
        {
            type: 'Legendary Explorer',
            target: 100,
            progress: 0,
            isUnlocked: false,
        },
    ];
    // Initialize or update awards
    for (const defaultAward of defaultAwards) {
        const found = existingAwards.find(a => a.type === defaultAward.type);
        if (!found) {
            await award_model_1.Award.create({
                userId,
                ...defaultAward,
            });
        }
        else {
            // Update progress for point-based awards
            if (defaultAward.type === 'PDF Itinerary' || defaultAward.type === 'Free Map') {
                await award_model_1.Award.updateOne({ _id: found._id }, {
                    $set: {
                        progress: defaultAward.progress,
                        isUnlocked: defaultAward.isUnlocked
                    }
                });
            }
        }
    }
    return await award_model_1.Award.find({ userId }).sort({ type: 1 });
};
const updateAwardProgress = async (userId, type, progressIncrement) => {
    const award = await award_model_1.Award.findOne({ userId, type });
    if (award) {
        const newProgress = Math.min(award.progress + progressIncrement, award.target);
        const isUnlocked = newProgress >= award.target;
        await award_model_1.Award.updateOne({ userId, type }, { $set: { progress: newProgress, isUnlocked } });
    }
};
const redeemFreeMap = async (userId, mapId) => {
    const user = await user_model_1.User.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found');
    }
    // Check if already redeemed
    if (user.redeemedFreeMap) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You have already redeemed your free map');
    }
    // Check if Free Map award is unlocked
    const freeMapAward = await award_model_1.Award.findOne({ userId, type: 'Free Map' });
    if (!freeMapAward || !freeMapAward.isUnlocked) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Free Map award is not unlocked yet');
    }
    // Update user: set redeemedFreeMap and add to purchasedMaps
    const result = await user_model_1.User.findByIdAndUpdate(userId, {
        $set: { redeemedFreeMap: new mongoose_1.Types.ObjectId(mapId) },
        $addToSet: { purchasedMaps: new mongoose_1.Types.ObjectId(mapId) },
    }, { new: true });
    return result;
};
exports.AwardServices = {
    getMyAwards,
    updateAwardProgress,
    redeemFreeMap,
};
