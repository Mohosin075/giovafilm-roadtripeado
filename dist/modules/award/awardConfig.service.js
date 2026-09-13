"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwardConfigServices = void 0;
const awardConfig_model_1 = require("./awardConfig.model");
const defaultConfigs = [
    {
        type: 'PDF Itinerary',
        title: { en: 'PDF Itinerary', es: 'Itinerario en PDF' },
        description: {
            en: 'Unlock custom travel itineraries in PDF format once you reach 500 XP points.',
            es: 'Desbloquea itinerarios de viaje personalizados en formato PDF al llegar a 500 puntos XP.',
        },
        target: 500,
    },
    {
        type: 'Free Map',
        title: { en: 'Free Map', es: 'Mapa Gratis' },
        description: {
            en: 'Claim any paid map completely for free once you reach 1000 XP points.',
            es: 'Obtén cualquier mapa de pago completamente gratis al llegar a 1000 puntos XP.',
        },
        target: 1000,
    },
    {
        type: 'Gourmet Guide',
        title: { en: 'Gourmet Guide', es: 'Guía Gourmet' },
        description: {
            en: 'Unlock exclusive restaurant and food recommendation lists once you reach 2000 XP points.',
            es: 'Desbloquea listas exclusivas de recomendaciones de restaurantes y comida al llegar a 2000 puntos XP.',
        },
        target: 2000,
    },
    {
        type: 'Top Reviewer',
        title: { en: 'Top Reviewer', es: 'Mejor Reseñador' },
        description: {
            en: 'Become a Top Reviewer to show a badge on your profile and get custom maps.',
            es: 'Conviértete en Top Reviewer para mostrar una insignia en tu perfil y obtener mapas personalizados.',
        },
        target: 1000,
    },
    {
        type: 'Trail Master',
        title: { en: 'Trail Master', es: 'Maestro del Sendero' },
        description: {
            en: 'For active hikers who complete trails and post reviews.',
            es: 'Para senderistas activos que completan rutas y publican reseñas.',
        },
        target: 500,
    },
    {
        type: 'History Buff',
        title: { en: 'History Buff', es: 'Aficionado a la Historia' },
        description: {
            en: 'Given to users who visit and review historical spots.',
            es: 'Otorgado a usuarios que visitan y reseñan lugares históricos.',
        },
        target: 1500,
    },
    {
        type: 'Legendary Explorer',
        title: { en: 'Legendary Explorer', es: 'Explorador Legendario' },
        description: {
            en: 'Given to elite explorers who have contributed reviews across all categories.',
            es: 'Otorgado a exploradores élite que han contribuido con reseñas en todas las categorías.',
        },
        target: 100,
    },
];
const seedAwardConfigs = async () => {
    try {
        await awardConfig_model_1.AwardConfig.collection.dropIndex('type_1');
        console.log('Successfully dropped unique index type_1 on awardconfigs');
    }
    catch (error) {
        // Index might not exist, ignore error
    }
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
const autoTranslate_1 = require("../../utils/autoTranslate");
const processAwardTranslations = async (payload) => {
    if (payload.title)
        payload.title = await (0, autoTranslate_1.autoTranslateField)(payload.title);
    if (payload.description)
        payload.description = await (0, autoTranslate_1.autoTranslateField)(payload.description);
};
const updateAwardConfig = async (id, payload) => {
    await processAwardTranslations(payload);
    const result = await awardConfig_model_1.AwardConfig.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    }).populate('mapId');
    return result;
};
const createAwardConfig = async (payload) => {
    await processAwardTranslations(payload);
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
