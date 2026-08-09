"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwardConfigServices = void 0;
const awardConfig_model_1 = require("./awardConfig.model");
const defaultConfigs = [
    {
        type: 'PDF Itinerary',
        title: 'PDF Itinerary',
        description: 'Unlock custom travel itineraries in PDF format once you reach 500 XP points.',
        target: 500,
    },
    {
        type: 'Free Map',
        title: 'Free Map',
        description: 'Claim any paid map completely for free once you reach 1000 XP points.',
        target: 1000,
    },
    {
        type: 'Gourmet Guide',
        title: 'Gourmet Guide',
        description: 'Unlock exclusive restaurant and food recommendation lists once you reach 2000 XP points.',
        target: 2000,
    },
    {
        type: 'Top Reviewer',
        title: 'Top Reviewer',
        description: 'Become a Top Reviewer to show a badge on your profile and get custom maps.',
        target: 1000,
    },
    {
        type: 'Trail Master',
        title: 'Trail Master',
        description: 'For active hikers who complete trails and post reviews.',
        target: 500,
    },
    {
        type: 'History Buff',
        title: 'History Buff',
        description: 'Given to users who visit and review historical spots.',
        target: 1500,
    },
    {
        type: 'Legendary Explorer',
        title: 'Legendary Explorer',
        description: 'Given to elite explorers who have contributed reviews across all categories.',
        target: 100,
    },
];
const seedAwardConfigs = async () => {
    for (const config of defaultConfigs) {
        const exists = await awardConfig_model_1.AwardConfig.findOne({ type: config.type });
        if (!exists) {
            await awardConfig_model_1.AwardConfig.create(config);
        }
    }
};
const getAllAwardConfigs = async () => {
    await seedAwardConfigs();
    return await awardConfig_model_1.AwardConfig.find({}).populate('mapId').sort({ createdAt: 1 });
};
const updateAwardConfig = async (id, payload) => {
    const result = await awardConfig_model_1.AwardConfig.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    }).populate('mapId');
    return result;
};
const createAwardConfig = async (payload) => {
    const result = await awardConfig_model_1.AwardConfig.create(payload);
    return result;
};
const deleteAwardConfig = async (id) => {
    const result = await awardConfig_model_1.AwardConfig.findByIdAndDelete(id);
    return result;
};
exports.AwardConfigServices = {
    seedAwardConfigs,
    getAllAwardConfigs,
    updateAwardConfig,
    createAwardConfig,
    deleteAwardConfig,
};
