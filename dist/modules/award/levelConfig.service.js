"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LevelConfigServices = void 0;
const mongoose_1 = require("mongoose");
const levelConfig_model_1 = require("./levelConfig.model");
const userLevels_constant_1 = require("../../constants/userLevels.constant");
const autoTranslate_1 = require("../../utils/autoTranslate");
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
                        reviews: lvl.reviews,
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
    await seedLevelConfigs();
    return await levelConfig_model_1.LevelConfig.find({}).sort({ level: 1 });
};
const processLevelTranslations = async (payload) => {
    if (payload.name)
        payload.name = await (0, autoTranslate_1.autoTranslateField)(payload.name);
    if (payload.description)
        payload.description = await (0, autoTranslate_1.autoTranslateField)(payload.description);
};
const createLevelConfig = async (payload) => {
    await processLevelTranslations(payload);
    return await levelConfig_model_1.LevelConfig.create(payload);
};
const updateLevelConfig = async (id, payload) => {
    await processLevelTranslations(payload);
    if (mongoose_1.Types.ObjectId.isValid(id)) {
        return await levelConfig_model_1.LevelConfig.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true,
        });
    }
    return await levelConfig_model_1.LevelConfig.findOneAndUpdate({ level: Number(id) }, payload, {
        new: true,
        upsert: true,
        runValidators: true,
    });
};
const deleteLevelConfig = async (id) => {
    if (mongoose_1.Types.ObjectId.isValid(id)) {
        return await levelConfig_model_1.LevelConfig.findByIdAndDelete(id);
    }
    return await levelConfig_model_1.LevelConfig.findOneAndDelete({ level: Number(id) });
};
exports.LevelConfigServices = {
    seedLevelConfigs,
    getAllLevelConfigs,
    createLevelConfig,
    updateLevelConfig,
    deleteLevelConfig,
};
