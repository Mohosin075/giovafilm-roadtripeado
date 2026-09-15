import { translate } from '@vitalets/google-translate-api'
import axios from 'axios'
import { I18nString, TranslatableString } from '../interfaces/i18n.interface'

/**
 * Decodes standard HTML entities in translation responses
 */
const decodeHTMLEntities = (str: string): string => {
  if (!str) return ''
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
}

/**
 * Robust multi-provider translation pipeline.
 * Tries Google Translate API -> MyMemory API.
 */
export const translateWithFallback = async (
  text: string,
  toLang: 'en' | 'es',
  fromLang: 'en' | 'es' | 'auto' = 'auto'
): Promise<string> => {
  if (!text || !text.trim()) return text
  const clean = text.trim()

  // 1. Try @vitalets/google-translate-api
  try {
    const res = await translate(clean, {
      from: fromLang === 'auto' ? undefined : fromLang,
      to: toLang,
    })
    if (res?.text && res.text.trim() !== '') {
      return decodeHTMLEntities(res.text.trim())
    }
  } catch (error) {
    // Suppress warning if secondary providers succeed
  }

  // 2. Try MyMemory Translation API
  try {
    const pair =
      fromLang === 'auto'
        ? toLang === 'en'
          ? 'es|en'
          : 'en|es'
        : `${fromLang}|${toLang}`
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${pair}`
    const response = await axios.get(url, { timeout: 6000 })
    const translatedText = response.data?.responseData?.translatedText
    if (
      translatedText &&
      typeof translatedText === 'string' &&
      !translatedText.startsWith('QUERY LENGTH LIMIT EXCEEDED') &&
      !translatedText.startsWith('MYMEMORY WARNING') &&
      !translatedText.includes('IS AN INVALID TARGET LANGUAGE')
    ) {
      return decodeHTMLEntities(translatedText.trim())
    }
  } catch (error) {
    // MyMemory failed
  }

  // 3. Fallback to clean original text
  return clean
}

/**
 * Checks if a string has strong Spanish markers
 */
export const isSpanishText = (text: string): boolean => {
  if (!text) return false
  return (
    /[áéíóúñü¿¡]/i.test(text) ||
    /\b(el|la|los|las|un|una|unos|unas|y|o|pero|para|por|en|con|de|del|al|es|son|este|esta|estos|estas|playa|rio|montaña|bosque|cascada|sendero|ruta|restaurante|comida|cueva|cabaña|mirador|faro|puerto|isla|punta|bahía|bahia|pueblo|ciudad)\b/i.test(
      text
    )
  )
}

/**
 * Ensures a field is converted to { en, es }.
 * If only one language is provided or a legacy string is passed,
 * auto-translates to the missing language via multi-provider translation pipeline.
 */
export const autoTranslateField = async (
  input: TranslatableString | undefined | null
): Promise<I18nString> => {
  if (!input) {
    return { en: '', es: '' }
  }

  // If already an object containing both en and es, return as-is or translate missing side
  if (typeof input === 'object' && input !== null) {
    const enVal = (input.en || '').trim()
    const esVal = (input.es || '').trim()

    if (enVal && esVal) {
      if (enVal === esVal && isSpanishText(esVal)) {
        const translatedEn = await translateWithFallback(esVal, 'en', 'es')
        return { es: esVal, en: translatedEn }
      } else if (enVal === esVal && !isSpanishText(enVal)) {
        const translatedEs = await translateWithFallback(enVal, 'es', 'en')
        return { en: enVal, es: translatedEs }
      }
      return { en: enVal, es: esVal }
    }

    if (esVal && !enVal) {
      const translated = await translateWithFallback(esVal, 'en', 'es')
      return { es: esVal, en: translated }
    }

    if (enVal && !esVal) {
      const translated = await translateWithFallback(enVal, 'es', 'en')
      return { en: enVal, es: translated }
    }

    return { en: '', es: '' }
  }

  const text = typeof input === 'string' ? input.trim() : ''
  if (!text) {
    return { en: '', es: '' }
  }

  // Detect source language and translate to the target
  if (isSpanishText(text)) {
    const translatedEn = await translateWithFallback(text, 'en', 'es')
    return {
      es: text,
      en: translatedEn,
    }
  } else {
    const translatedEs = await translateWithFallback(text, 'es', 'en')
    return {
      en: text,
      es: translatedEs,
    }
  }
}


