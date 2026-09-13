import { translate } from '@vitalets/google-translate-api'
import { I18nString, TranslatableString } from '../interfaces/i18n.interface'

/**
 * Ensures a field is converted to { en, es }.
 * If only one language is provided or a legacy string is passed,
 * auto-translates to the missing language via @vitalets/google-translate-api.
 */
export const autoTranslateField = async (
  input: TranslatableString | undefined | null,
  sourceLang: 'en' | 'es' = 'es'
): Promise<I18nString> => {
  if (!input) {
    return { en: '', es: '' }
  }

  // If already an object containing both en and es, return as-is
  if (typeof input === 'object' && input !== null) {
    const enVal = (input.en || '').trim()
    const esVal = (input.es || '').trim()

    if (enVal && esVal) {
      return { en: enVal, es: esVal }
    }

    if (esVal && !enVal) {
      return await autoTranslateField(esVal, 'es')
    }

    if (enVal && !esVal) {
      return await autoTranslateField(enVal, 'en')
    }
  }

  const text = typeof input === 'string' ? input.trim() : ''
  if (!text) {
    return { en: '', es: '' }
  }

  const targetLang = sourceLang === 'es' ? 'en' : 'es'

  try {
    const res = await translate(text, { from: sourceLang, to: targetLang })
    const translatedText = res.text || text
    return {
      [sourceLang]: text,
      [targetLang]: translatedText,
    } as unknown as I18nString
  } catch (error) {
    // Fail-safe: log warning silently and fallback to using original text for both
    console.warn(`[AutoTranslate] Fallback used for text: "${text.slice(0, 30)}..." due to error:`, error)
    return {
      en: text,
      es: text,
    }
  }
}
