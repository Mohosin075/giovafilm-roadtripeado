"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoTranslateField = void 0;
const google_translate_api_1 = require("@vitalets/google-translate-api");
/**
 * Ensures a field is converted to { en, es }.
 * If only one language is provided or a legacy string is passed,
 * auto-translates to the missing language via @vitalets/google-translate-api.
 */
const autoTranslateField = async (input, sourceLang = 'es') => {
    if (!input) {
        return { en: '', es: '' };
    }
    // If already an object containing both en and es, return as-is
    if (typeof input === 'object' && input !== null) {
        const enVal = (input.en || '').trim();
        const esVal = (input.es || '').trim();
        if (enVal && esVal) {
            return { en: enVal, es: esVal };
        }
        if (esVal && !enVal) {
            return await (0, exports.autoTranslateField)(esVal, 'es');
        }
        if (enVal && !esVal) {
            return await (0, exports.autoTranslateField)(enVal, 'en');
        }
    }
    const text = typeof input === 'string' ? input.trim() : '';
    if (!text) {
        return { en: '', es: '' };
    }
    const targetLang = sourceLang === 'es' ? 'en' : 'es';
    try {
        const res = await (0, google_translate_api_1.translate)(text, { from: sourceLang, to: targetLang });
        const translatedText = res.text || text;
        return {
            [sourceLang]: text,
            [targetLang]: translatedText,
        };
    }
    catch (error) {
        // Fail-safe: log warning silently and fallback to using original text for both
        console.warn(`[AutoTranslate] Fallback used for text: "${text.slice(0, 30)}..." due to error:`, error);
        return {
            en: text,
            es: text,
        };
    }
};
exports.autoTranslateField = autoTranslateField;
