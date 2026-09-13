const knownValuesMap: Record<string, { en: string; es: string }> = {
  // Difficulty
  easy: { en: 'Easy', es: 'Fácil' },
  moderate: { en: 'Moderate', es: 'Moderado' },
  hard: { en: 'Hard', es: 'Difícil' },
  fácil: { en: 'Easy', es: 'Fácil' },
  facil: { en: 'Easy', es: 'Fácil' },
  moderado: { en: 'Moderate', es: 'Moderado' },
  difícil: { en: 'Hard', es: 'Difícil' },
  dificil: { en: 'Hard', es: 'Difícil' },

  // Place Services
  'family friendly': { en: 'Family Friendly', es: 'Familiar' },
  'familiar': { en: 'Family Friendly', es: 'Familiar' },
  'apto para familias': { en: 'Family Friendly', es: 'Familiar' },
  'food nearby': { en: 'Food Nearby', es: 'Comida cercana' },
  'comida cercana': { en: 'Food Nearby', es: 'Comida cercana' },
  'guided tour': { en: 'Guided Tour', es: 'Visitas guiadas' },
  'visitas guiadas': { en: 'Guided Tour', es: 'Visitas guiadas' },
  'visita guiada': { en: 'Guided Tour', es: 'Visitas guiadas' },
  'parking': { en: 'Parking', es: 'Estacionamiento' },
  'estacionamiento': { en: 'Parking', es: 'Estacionamiento' },
  'pet friendly': { en: 'Pet Friendly', es: 'Se admiten mascotas' },
  'se admiten mascotas': { en: 'Pet Friendly', es: 'Se admiten mascotas' },
  'restrooms': { en: 'Restrooms', es: 'Baños' },
  'baños': { en: 'Restrooms', es: 'Baños' },
  'banos': { en: 'Restrooms', es: 'Baños' },
  'wifi': { en: 'Wifi', es: 'Wifi' },

  // Schedules
  'always open': { en: 'Always open', es: 'Siempre abierto' },
  'siempre abierto': { en: 'Always open', es: 'Siempre abierto' },
}

/**
 * Safely extracts a single localized string for the requested language ('en' | 'es').
 * Handles legacy string fields (backward compatibility), nulls, and fallback order.
 */
export const localizeField = (field: any, lang: 'en' | 'es' = 'es'): string => {
  if (field === null || field === undefined) return ''
  
  // Legacy DB compatibility & known translation dictionary
  if (typeof field === 'string') {
    const lower = field.trim().toLowerCase()
    if (knownValuesMap[lower]) {
      return knownValuesMap[lower][lang]
    }
    return field
  }
  
  // If object { en, es }
  if (typeof field === 'object') {
    const primary = field[lang]
    const fallback = lang === 'es' ? field.en : field.es
    return primary || fallback || field.es || field.en || ''
  }

  return String(field)
}

/**
 * Recursively localizes specified fields on a document or array of documents.
 * Preserves all other document properties untouched.
 */
export const localizeDocument = <T extends Record<string, any>>(
  data: T | T[] | null | undefined,
  lang: 'en' | 'es' = 'es',
  fields: string[] = []
): any => {
  if (!data) return data

  if (Array.isArray(data)) {
    return data.map(item => localizeDocument(item, lang, fields))
  }

  // Handle Mongoose Lean or Document objects
  const obj = typeof (data as any).toObject === 'function' ? (data as any).toObject() : { ...data }

  fields.forEach(fieldPath => {
    // Handle nested paths like "recommendations.tips" or "accessibility.notes"
    if (fieldPath.includes('.')) {
      const parts = fieldPath.split('.')
      let current = obj
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current || typeof current !== 'object') break
        current = current[parts[i]]
      }
      const lastKey = parts[parts.length - 1]
      if (current && current[lastKey] !== undefined) {
        current[lastKey] = localizeField(current[lastKey], lang)
      }
    } else if (obj[fieldPath] !== undefined) {
      if (Array.isArray(obj[fieldPath])) {
        // e.g. features: [{ en, es }, { en, es }] or string[]
        obj[fieldPath] = obj[fieldPath].map((item: any) => localizeField(item, lang))
      } else {
        obj[fieldPath] = localizeField(obj[fieldPath], lang)
      }
    }
  })

  return obj
}
