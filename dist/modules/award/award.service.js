"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwardServices = void 0;
const award_model_1 = require("./award.model");
const getMyAwards = async (userId) => {
    const existingAwards = await award_model_1.Award.find({ userId });
    const defaultAwards = [
        {
            type: 'Gourmet Guide',
            target: 2000,
            progress: 1458,
            isUnlocked: false,
        },
        {
            type: 'Top Reviewer',
            target: 1000,
            progress: 800,
            isUnlocked: false,
        },
        {
            type: 'Trail Master',
            target: 500,
            progress: 250,
            isUnlocked: false,
        },
        {
            type: 'History Buff',
            target: 1500,
            progress: 1200,
            isUnlocked: false,
        },
        {
            type: 'Legendary Explorer',
            target: 100,
            progress: 100,
            isUnlocked: true,
        },
    ];
    // If user doesn't have all default awards, initialize them
    for (const defaultAward of defaultAwards) {
        const found = existingAwards.find(a => a.type === defaultAward.type);
        if (!found) {
            await award_model_1.Award.create({
                userId,
                ...defaultAward,
            });
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
exports.AwardServices = {
    getMyAwards,
    updateAwardProgress,
};
