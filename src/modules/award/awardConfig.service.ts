import { AwardConfig } from './awardConfig.model'
import { IAwardConfig } from './awardConfig.interface'

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
]

const seedAwardConfigs = async () => {
  try {
    await AwardConfig.collection.dropIndex('type_1')
    console.log('Successfully dropped unique index type_1 on awardconfigs')
  } catch (error) {
    // Index might not exist, ignore error
  }

  for (const config of defaultConfigs) {
    const exists = await AwardConfig.findOne({ type: config.type })
    if (!exists) {
      await AwardConfig.create(config)
    }
  }
}

const getAllAwardConfigs = async (): Promise<IAwardConfig[]> => {
  await seedAwardConfigs()
  return await AwardConfig.find({}).populate('mapId').sort({ createdAt: 1 })
}

import { autoTranslateField } from '../../utils/autoTranslate'

const processAwardTranslations = async (payload: Partial<IAwardConfig>) => {
  if (payload.title) payload.title = await autoTranslateField(payload.title)
  if (payload.description) payload.description = await autoTranslateField(payload.description)
}

const updateAwardConfig = async (
  id: string,
  payload: Partial<IAwardConfig>
): Promise<IAwardConfig | null> => {
  await processAwardTranslations(payload)
  const result = await AwardConfig.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate('mapId')
  return result
}

const createAwardConfig = async (
  payload: IAwardConfig
): Promise<IAwardConfig> => {
  await processAwardTranslations(payload)
  const result = await AwardConfig.create(payload)
  return result
}

const deleteAwardConfig = async (
  id: string
): Promise<IAwardConfig | null> => {
  const result = await AwardConfig.findByIdAndDelete(id)
  return result
}

export const AwardConfigServices = {
  seedAwardConfigs,
  getAllAwardConfigs,
  updateAwardConfig,
  createAwardConfig,
  deleteAwardConfig,
}
