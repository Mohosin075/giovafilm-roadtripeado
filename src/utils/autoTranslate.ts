import { translate } from '@vitalets/google-translate-api'
import axios from 'axios'
import { I18nString, TranslatableString } from '../interfaces/i18n.interface'

/**
 * Decodes standard HTML entities in translation responses
 */
const decodeHTMLEntities = (str: string): string => {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

/**
 * Robust multi-provider translation pipeline.
 * Tries Google Translate API -> MyMemory API -> GTX Endpoint -> Original Text fallback.
 */
const translateWithFallback = async (
  text: string,
  sourceLang: 'en' | 'es',
  targetLang: 'en' | 'es'
): Promise<string> => {
  if (!text || !text.trim()) return text

  // 1. Try @vitalets/google-translate-api
  try {
    const res = await translate(text, { from: sourceLang, to: targetLang })
    if (res?.text && res.text.trim() !== '') {
      return res.text.trim()
    }
  } catch (error) {
    // Suppress warning if secondary providers succeed
  }

  // 2. Try MyMemory Translation API
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
    const response = await axios.get(url, { timeout: 5000 })
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

  // 3. Try Google Translate Web Client Fallback (GTX endpoint with custom User-Agent)
  try {
    const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
    const gtxRes = await axios.get(gtxUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 5000,
    })
    if (gtxRes.data && Array.isArray(gtxRes.data[0])) {
      const translatedParts = gtxRes.data[0].map((part: any) => part[0]).join('')
      if (translatedParts) return translatedParts.trim()
    }
  } catch (error) {
    // GTX fallback failed
  }

  console.warn(`[AutoTranslate] All translation providers failed for text: "${text.slice(0, 30)}..."`)
  return text
}

/**
 * Ensures a field is converted to { en, es }.
 * If only one language is provided or a legacy string is passed,
 * auto-translates to the missing language via multi-provider translation pipeline.
 */
export const autoTranslateField = async (
  input: TranslatableString | undefined | null,
  sourceLang: 'en' | 'es' = 'es'
): Promise<I18nString> => {
  if (!input) {
    return { en: '', es: '' }
  }

  // If already an object containing both en and es, return as-is or translate missing side
  if (typeof input === 'object' && input !== null) {
    const enVal = (input.en || '').trim()
    const esVal = (input.es || '').trim()

    if (enVal && esVal) {
      return { en: enVal, es: esVal }
    }

    if (esVal && !enVal) {
      const translated = await translateWithFallback(esVal, 'es', 'en')
      return { es: esVal, en: translated }
    }

    if (enVal && !esVal) {
      const translated = await translateWithFallback(enVal, 'en', 'es')
      return { en: enVal, es: translated }
    }
  }

  const text = typeof input === 'string' ? input.trim() : ''
  if (!text) {
    return { en: '', es: '' }
  }

  // Smart bi-directional detection:
  // 1. First try translating assuming Spanish -> English
  const translatedEn = await translateWithFallback(text, 'es', 'en')

  // If the translation produced a different text, input was Spanish!
  if (translatedEn.toLowerCase() !== text.toLowerCase()) {
    return {
      es: text,
      en: translatedEn,
    }
  }

  // 2. If es->en returned the same text, input is likely English — try translating English -> Spanish
  const translatedEs = await translateWithFallback(text, 'en', 'es')

  if (translatedEs.toLowerCase() !== text.toLowerCase()) {
    return {
      en: text,
      es: translatedEs,
    }
  }

  // Fallback if text is identical in both languages (e.g. proper nouns like "San Juan")
  return {
    es: text,
    en: text,
  }
}


