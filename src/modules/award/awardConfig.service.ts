import { AwardConfig } from './awardConfig.model'
import { IAwardConfig } from './awardConfig.interface'

const defaultConfigs = [
  {
    type: 'Exclusive Discount',
    title: { en: '10% OFF Map Discount', es: '10% de descuento en 1 mapa' },
    description: {
      en: 'Get 10% OFF when you buy 1 map at Level 0 (Explorador).',
      es: 'Obtén 10% de descuento al comprar 1 mapa en el Nivel 0 (Explorador).',
    },
    target: 0,
    discountPercentage: 10,
  },
  {
    type: 'PDF Itinerary',
    title: { en: 'PDF Itinerary', es: 'Itinerario en PDF' },
    description: {
      en: 'Unlock travel itineraries in PDF format at Level 1 (Aventurero - 100 pts & 6 reviews).',
      es: 'Desbloquea itinerarios de viaje en PDF en el Nivel 1 (Aventurero - 100 pts y 6 reseñas).',
    },
    target: 100,
  },
  {
    type: 'PDF Itinerary',
    title: { en: 'PDF Itinerary', es: 'Itinerario en PDF' },
    description: {
      en: 'Unlock travel itineraries in PDF format at Level 2 (Tlacuilo - 200 pts & 13 reviews).',
      es: 'Desbloquea itinerarios de viaje en PDF en el Nivel 2 (Tlacuilo - 200 pts y 13 reseñas).',
    },
    target: 200,
  },
  {
    type: 'Exclusive Discount',
    title: { en: '25% OFF Map Discount', es: '25% de descuento en 1 mapa' },
    description: {
      en: 'Get 25% OFF when you buy 1 map at Level 3 (Expedicionario - 400 pts & 26 reviews).',
      es: 'Obtén 25% de descuento al comprar 1 mapa en el Nivel 3 (Expedicionario - 400 pts y 26 reseñas).',
    },
    target: 400,
    discountPercentage: 25,
  },
  {
    type: 'PDF Itinerary',
    title: { en: 'PDF Itinerary', es: 'Itinerario en PDF' },
    description: {
      en: 'Unlock travel itineraries in PDF format at Level 4 (Viajero - 700 pts & 46 reviews).',
      es: 'Desbloquea itinerarios de viaje en PDF en el Nivel 4 (Viajero - 700 pts y 46 reseñas).',
    },
    target: 700,
  },
  {
    type: 'Free Map',
    title: { en: '1 Free Map', es: '1 Mapa Gratis' },
    description: {
      en: 'Claim 1 free map of your choice at Level 5 (Chasqui - 1,300 pts & 86 reviews).',
      es: 'Obtén 1 mapa gratis a tu elección en el Nivel 5 (Chasqui - 1,300 pts y 86 reseñas).',
    },
    target: 1300,
  },
  {
    type: 'Exclusive Discount',
    title: { en: '50% OFF Map Discount', es: '50% de descuento en 1 mapa' },
    description: {
      en: 'Get 50% OFF when you buy 1 map at Level 6 (Cronista - 2,200 pts & 146 reviews).',
      es: 'Obtén 50% de descuento al comprar 1 mapa en el Nivel 6 (Cronista - 2,200 pts y 146 reseñas).',
    },
    target: 2200,
    discountPercentage: 50,
  },
  {
    type: 'PDF Itinerary',
    title: { en: 'PDF Itinerary', es: 'Itinerario en PDF' },
    description: {
      en: 'Unlock travel itineraries in PDF format at Level 7 (Baquiano - 3,500 pts & 233 reviews).',
      es: 'Desbloquea itinerarios de viaje en PDF en el Nivel 7 (Baquiano - 3,500 pts y 233 reseñas).',
    },
    target: 3500,
  },
  {
    type: 'Exclusive Discount',
    title: { en: '75% OFF Map Discount', es: '75% de descuento en 1 mapa' },
    description: {
      en: 'Get 75% OFF when you buy 1 map at Level 8 (Cartógrafo - 5,500 pts & 366 reviews).',
      es: 'Obtén 75% de descuento al comprar 1 mapa en el Nivel 8 (Cartógrafo - 5,500 pts y 366 reseñas).',
    },
    target: 5500,
    discountPercentage: 75,
  },
  {
    type: 'PDF Itinerary',
    title: { en: 'PDF Itinerary', es: 'Itinerario en PDF' },
    description: {
      en: 'Unlock travel itineraries in PDF format at Level 9 (Maestro Ruta - 8,500 pts & 566 reviews).',
      es: 'Desbloquea itinerarios de viaje en PDF en el Nivel 9 (Maestro Ruta - 8,500 pts y 566 reseñas).',
    },
    target: 8500,
  },
  {
    type: 'Free Map',
    title: { en: '1 Free Map', es: '1 Mapa Gratis' },
    description: {
      en: 'Claim 1 free map of your choice at Level 10 (Leyenda - 13,000 pts & 866 reviews).',
      es: 'Obtén 1 mapa gratis a tu elección en el Nivel 10 (Leyenda - 13,000 pts y 866 reseñas).',
    },
    target: 13000,
  },
  {
    type: 'Free Map',
    title: { en: '1 Free Map', es: '1 Mapa Gratis' },
    description: {
      en: 'Claim 1 free map of your choice at Level 11 (Gran Leyenda - 20,000 pts & 1,333 reviews).',
      es: 'Obtén 1 mapa gratis a tu elección en el Nivel 11 (Gran Leyenda - 20,000 pts y 1,333 reseñas).',
    },
    target: 20000,
  },
  {
    type: 'Free Map',
    title: { en: '1 Free Map', es: '1 Mapa Gratis' },
    description: {
      en: 'Claim 1 free map of your choice at Level 12 (Mítico - 30,000 pts & 2,000 reviews).',
      es: 'Obtén 1 mapa gratis a tu elección en el Nivel 12 (Mítico - 30,000 pts y 2,000 reseñas).',
    },
    target: 30000,
  },
  {
    type: 'Free Map',
    title: { en: '1 Free Map', es: '1 Mapa Gratis' },
    description: {
      en: 'Claim 1 free map of your choice at Level 13 (Inmortal - 45,000 pts & 3,000 reviews).',
      es: 'Obtén 1 mapa gratis a tu elección en el Nivel 13 (Inmortal - 45,000 pts y 3,000 reseñas).',
    },
    target: 45000,
  },
  {
    type: 'Free Map',
    title: { en: '2 Free Maps', es: '2 Mapas Gratis' },
    description: {
      en: 'Claim 2 free maps of your choice at Level 14 (Supremo - 65,000 pts & 4,333 reviews).',
      es: 'Obtén 2 mapas gratis a tu elección en el Nivel 14 (Supremo - 65,000 pts y 4,333 reseñas).',
    },
    target: 65000,
  },
]

const seedAwardConfigs = async () => {
  try {
    await AwardConfig.collection.dropIndex('type_1')
  } catch (error) {
    // Index might not exist, ignore error
  }

  // Check if configs exist
  const count = await AwardConfig.countDocuments()
  if (count === 0) {
    for (const config of defaultConfigs) {
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
