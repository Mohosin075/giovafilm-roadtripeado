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
 * Checks if a value is an I18n object { en?: string, es?: string }
 */
export const isI18nObject = (val: any): boolean => {
  return (
    val !== null &&
    typeof val === 'object' &&
    !Array.isArray(val) &&
    !(val instanceof Date) &&
    !(val as any)._bsontype &&
    ('en' in val || 'es' in val) &&
    (typeof val.en === 'string' || typeof val.es === 'string')
  )
}

/**
 * Safely extracts a single localized string for the requested language ('en' | 'es').
 * Handles legacy string fields (backward compatibility), nulls, and fallback order.
 */
export const localizeField = (field: any, lang: 'en' | 'es' = 'es'): any => {
  if (field === null || field === undefined) return field

  // Legacy DB compatibility & known translation dictionary
  if (typeof field === 'string') {
    const lower = field.trim().toLowerCase()
    if (knownValuesMap[lower]) {
      return knownValuesMap[lower][lang]
    }
    return field
  }

  // If object { en, es }
  if (isI18nObject(field)) {
    const primary = field[lang]
    const fallback = lang === 'es' ? field.en : field.es
    return primary || fallback || field.es || field.en || ''
  }

  return field
}

/**
 * Recursively localizes specified fields or any { en, es } object on a document or array of documents.
 * Preserves all other document properties untouched.
 */
export const localizeDocument = <T extends Record<string, any>>(
  data: T | T[] | null | undefined,
  lang: 'en' | 'es' = 'es',
  fields: string[] = []
): any => {
  if (data === null || data === undefined) return data

  if (Array.isArray(data)) {
    return data.map(item => localizeDocument(item, lang, fields))
  }

  if (
    typeof data !== 'object' ||
    data instanceof Date ||
    (data as any)._bsontype
  ) {
    return localizeField(data, lang)
  }

  // Handle paginated wrapper objects { meta: {...}, data: [...] }
  if (data && typeof data === 'object' && Array.isArray((data as any).data)) {
    return {
      ...data,
      data: (data as any).data.map((item: any) =>
        localizeDocument(item, lang, fields)
      ),
    }
  }

  // If the object itself is an i18n object { en, es }
  if (isI18nObject(data)) {
    return localizeField(data, lang)
  }

  // Handle Mongoose Lean or Document objects
  const obj =
    typeof (data as any).toObject === 'function'
      ? (data as any).toObject()
      : { ...data }

  // 1. Explicit nested field paths like "recommendations.tips" or "accessibility.notes"
  fields.forEach(fieldPath => {
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
    }
  })

  // 2. Automatically traverse all properties of the document
  for (const key of Object.keys(obj)) {
    const val = obj[key]
    if (val === null || val === undefined) continue

    if (isI18nObject(val)) {
      obj[key] = localizeField(val, lang)
    } else if (Array.isArray(val)) {
      obj[key] = val.map((item: any) => {
        if (isI18nObject(item)) return localizeField(item, lang)
        if (typeof item === 'string') return localizeField(item, lang)
        if (typeof item === 'object' && item !== null)
          return localizeDocument(item, lang, fields)
        return item
      })
    } else if (
      typeof val === 'object' &&
      !(val instanceof Date) &&
      !(val as any)._bsontype
    ) {
      obj[key] = localizeDocument(val, lang, fields)
    } else if (typeof val === 'string' && (fields.includes(key) || knownValuesMap[val.trim().toLowerCase()])) {
      obj[key] = localizeField(val, lang)
    }
  }

  return obj
}
