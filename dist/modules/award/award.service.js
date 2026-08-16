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
const awardConfig_model_1 = require("./awardConfig.model");
const awardConfig_service_1 = require("./awardConfig.service");
const getMyAwards = async (userId) => {
    const user = await user_model_1.User.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found');
    }
    // Seed default configs if missing
    await awardConfig_service_1.AwardConfigServices.seedAwardConfigs();
    // Fetch configs and existing awards
    const configs = await awardConfig_model_1.AwardConfig.find({}).populate('mapId');
    const existingAwards = await award_model_1.Award.find({ userId });
    const awards = [];
    for (const config of configs) {
        const found = existingAwards.find(a => a.type === config.type);
        let progress = 0;
        let isUnlocked = false;
        if (config.type === 'PDF Itinerary' ||
            config.type === 'Free Map' ||
            config.type === 'Gourmet Guide' ||
            config.type === 'Exclusive Discount' ||
            config.type === 'Permanent Discount') {
            progress = user.points || 0;
            isUnlocked = progress >= config.target;
        }
        else if (found) {
            progress = found.progress;
            isUnlocked = found.progress >= config.target;
        }
        if (!found) {
            const newAward = await award_model_1.Award.create({
                userId,
                type: config.type,
                target: config.target,
                progress,
                isUnlocked,
            });
            // Attach config properties for frontend
            const awardObj = newAward.toObject();
            awardObj.config = config;
            awards.push(awardObj);
        }
        else {
            // Update target, progress, isUnlocked if they differ
            const updates = { target: config.target };
            if (config.type === 'PDF Itinerary' ||
                config.type === 'Free Map' ||
                config.type === 'Gourmet Guide' ||
                config.type === 'Exclusive Discount' ||
                config.type === 'Permanent Discount') {
                updates.progress = progress;
                updates.isUnlocked = isUnlocked;
            }
            else {
                updates.isUnlocked = found.progress >= config.target;
            }
            const updatedAward = await award_model_1.Award.findByIdAndUpdate(found._id, { $set: updates }, { new: true });
            const awardObj = updatedAward.toObject();
            awardObj.config = config;
            awards.push(awardObj);
        }
    }
    return awards.sort((a, b) => a.type.localeCompare(b.type));
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
