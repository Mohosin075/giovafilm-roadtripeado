"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LevelConfigServices = exports.clearLevelConfigCache = void 0;
const mongoose_1 = require("mongoose");
const levelConfig_model_1 = require("./levelConfig.model");
const userLevels_constant_1 = require("../../constants/userLevels.constant");
const autoTranslate_1 = require("../../utils/autoTranslate");
const user_model_1 = require("../user/user.model");
const user_1 = require("../../enum/user");
let cachedConfigs = null;
let cacheExpiresAt = 0;
const clearLevelConfigCache = () => {
    cachedConfigs = null;
    cacheExpiresAt = 0;
};
exports.clearLevelConfigCache = clearLevelConfigCache;
const seedLevelConfigs = async () => {
    try {
        const count = await levelConfig_model_1.LevelConfig.countDocuments();
        if (count === 0) {
            for (const lvl of userLevels_constant_1.USER_LEVELS) {
                await levelConfig_model_1.LevelConfig.updateOne({ level: lvl.level }, {
                    $setOnInsert: {
                        level: lvl.level,
                        name: { en: lvl.name, es: lvl.name },
                        points: lvl.points,
                        reviews: 0,
                    },
                }, { upsert: true });
            }
        }
    }
    catch (error) {
        console.error('Error seeding level configs:', error);
    }
};
const getAllLevelConfigs = async () => {
    const now = Date.now();
    if (cachedConfigs && cachedConfigs.length > 0 && now < cacheExpiresAt) {
        return cachedConfigs;
    }
    await seedLevelConfigs();
    const configs = await levelConfig_model_1.LevelConfig.find({}).sort({ level: 1 }).lean();
    cachedConfigs = configs;
    cacheExpiresAt = now + 60 * 1000; // 60s TTL
    return cachedConfigs;
};
const calculateDynamicLevelFromList = (points, approvedReviews = 0, configs) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const list = configs && configs.length > 0
        ? [...configs].sort((a, b) => Number(a.level) - Number(b.level))
        : [...userLevels_constant_1.USER_LEVELS].sort((a, b) => Number(a.level) - Number(b.level));
    let currentConfig = list[0] || {
        level: 0,
        name: 'Explorador',
        points: 0,
        reviews: 0,
    };
    let currentIndex = 0;
    for (let i = list.length - 1; i >= 0; i--) {
        const lvl = list[i];
        const reqPoints = Number((_a = lvl.points) !== null && _a !== void 0 ? _a : lvl.xp) || 0;
        if (points >= reqPoints) {
            currentConfig = lvl;
            currentIndex = i;
            break;
        }
    }
    const nextConfig = currentIndex < list.length - 1 ? list[currentIndex + 1] : null;
    const currentPointsReq = Number((_b = currentConfig.points) !== null && _b !== void 0 ? _b : currentConfig.xp) || 0;
    const currentReviewsReq = Number(currentConfig.reviews) || 0;
    let progressPercent = 100;
    let pointsRemaining = 0;
    let reviewsRemaining = 0;
    let nextLevelData = null;
    if (nextConfig) {
        const nextPointsReq = Number((_c = nextConfig.points) !== null && _c !== void 0 ? _c : nextConfig.xp) || 0;
        const nextReviewsReq = Number(nextConfig.reviews) || 0;
        const pointsDelta = Math.max(1, nextPointsReq - currentPointsReq);
        const earnedDelta = Math.max(0, points - currentPointsReq);
        progressPercent = Math.min(100, Math.max(0, Math.round((earnedDelta / pointsDelta) * 100)));
        pointsRemaining = Math.max(0, nextPointsReq - points);
        reviewsRemaining = Math.max(0, nextReviewsReq - approvedReviews);
        const nextTitle = typeof nextConfig.name === 'string'
            ? nextConfig.name
            : ((_d = nextConfig.name) === null || _d === void 0 ? void 0 : _d.es) ||
                ((_e = nextConfig.name) === null || _e === void 0 ? void 0 : _e.en) ||
                nextConfig.title ||
                `Nivel ${nextConfig.level}`;
        nextLevelData = {
            levelNumber: Number(nextConfig.level),
            title: nextTitle,
            name: nextConfig.name,
            pointsRequired: nextPointsReq,
            pointsRemaining,
            reviewsRequired: nextReviewsReq,
            reviewsRemaining,
        };
    }
    const currentTitle = typeof currentConfig.name === 'string'
        ? currentConfig.name
        : ((_f = currentConfig.name) === null || _f === void 0 ? void 0 : _f.es) ||
            ((_g = currentConfig.name) === null || _g === void 0 ? void 0 : _g.en) ||
            currentConfig.title ||
            `Nivel ${currentConfig.level}`;
    return {
        levelNumber: Number(currentConfig.level),
        title: currentTitle,
        name: currentConfig.name,
        pointsRequired: currentPointsReq,
        reviewsRequired: currentReviewsReq,
        nextLevel: nextLevelData,
        progressPercent,
        badgeUrl: currentConfig.badgeUrl,
        description: currentConfig.description,
    };
};
const getDynamicUserLevel = async (points, approvedReviews = 0) => {
    const configs = await getAllLevelConfigs();
    return calculateDynamicLevelFromList(points, approvedReviews, configs);
};
const syncAllUsersLevels = async () => {
    try {
        const configs = await levelConfig_model_1.LevelConfig.find({}).sort({ level: 1 }).lean();
        if (!configs || configs.length === 0)
            return;
        const users = await user_model_1.User.find({
            status: { $nin: [user_1.USER_STATUS.DELETED] },
        })
            .select('_id points totalReviewsApproved level')
            .lean();
        const bulkOps = [];
        for (const u of users) {
            const pts = u.points || 0;
            const revs = u.totalReviewsApproved || 0;
            const dynamicInfo = calculateDynamicLevelFromList(pts, revs, configs);
            if (u.level !== dynamicInfo.levelNumber) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: u._id },
                        update: { $set: { level: dynamicInfo.levelNumber } },
                    },
                });
            }
        }
        if (bulkOps.length > 0) {
            await user_model_1.User.bulkWrite(bulkOps);
            console.log(`[syncAllUsersLevels] Real-time synced ${bulkOps.length} user level(s) based on rewards configuration.`);
        }
    }
    catch (err) {
        console.error('[syncAllUsersLevels] Error syncing user levels:', err);
    }
};
const processLevelTranslations = async (payload) => {
    if (payload.name)
        payload.name = await (0, autoTranslate_1.autoTranslateField)(payload.name);
    if (payload.description)
        payload.description = await (0, autoTranslate_1.autoTranslateField)(payload.description);
};
const createLevelConfig = async (payload) => {
    await processLevelTranslations(payload);
    const result = await levelConfig_model_1.LevelConfig.create(payload);
    (0, exports.clearLevelConfigCache)();
    syncAllUsersLevels().catch(err => console.error('Failed to sync users level after create:', err));
    return result;
};
const updateLevelConfig = async (id, payload) => {
    await processLevelTranslations(payload);
    let result = null;
    if (mongoose_1.Types.ObjectId.isValid(id)) {
        result = await levelConfig_model_1.LevelConfig.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true,
        });
    }
    else {
        result = await levelConfig_model_1.LevelConfig.findOneAndUpdate({ level: Number(id) }, payload, {
            new: true,
            upsert: true,
            runValidators: true,
        });
    }
    (0, exports.clearLevelConfigCache)();
    syncAllUsersLevels().catch(err => console.error('Failed to sync users level after update:', err));
    return result;
};
const deleteLevelConfig = async (id) => {
    let result = null;
    if (mongoose_1.Types.ObjectId.isValid(id)) {
        result = await levelConfig_model_1.LevelConfig.findByIdAndDelete(id);
    }
    else {
        result = await levelConfig_model_1.LevelConfig.findOneAndDelete({ level: Number(id) });
    }
    (0, exports.clearLevelConfigCache)();
    syncAllUsersLevels().catch(err => console.error('Failed to sync users level after delete:', err));
    return result;
};
exports.LevelConfigServices = {
    seedLevelConfigs,
    getAllLevelConfigs,
    createLevelConfig,
    updateLevelConfig,
    deleteLevelConfig,
    getDynamicUserLevel,
    calculateDynamicLevelFromList,
    syncAllUsersLevels,
    clearLevelConfigCache: exports.clearLevelConfigCache,
};
