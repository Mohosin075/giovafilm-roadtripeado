/**
 * Safely extracts a single localized string for the requested language ('en' | 'es').
 * Handles legacy string fields (backward compatibility), nulls, and fallback order.
 */
export const localizeField = (field: any, lang: 'en' | 'es' = 'es'): string => {
  if (field === null || field === undefined) return ''
  
  // Legacy DB compatibility: if field is a plain string, return it directly
  if (typeof field === 'string') return field
  
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
