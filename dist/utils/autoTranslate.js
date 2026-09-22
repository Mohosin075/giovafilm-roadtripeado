"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoTranslateField = exports.isSpanishText = exports.translateWithFallback = void 0;
const google_translate_api_1 = require("@vitalets/google-translate-api");
const axios_1 = __importDefault(require("axios"));
/**
 * Decodes standard HTML entities in translation responses
 */
const decodeHTMLEntities = (str) => {
    if (!str)
        return '';
    return str
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
};
/**
 * Robust multi-provider translation pipeline.
 * Tries MyMemory API (with valid email tier) -> Google Translate API -> Google GTX fallback.
 */
const translateWithFallback = async (text, toLang, fromLang = 'auto') => {
    var _a, _b;
    if (!text || !text.trim())
        return text;
    const clean = text.trim();
    // 1. Try MyMemory Translation API with email (10,000 words/day free limit)
    try {
        const pair = fromLang === 'auto'
            ? toLang === 'en'
                ? 'es|en'
                : 'en|es'
            : `${fromLang}|${toLang}`;
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=${pair}&de=dev@giovafilm.com`;
        const response = await axios_1.default.get(url, { timeout: 6000 });
        const translatedText = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.responseData) === null || _b === void 0 ? void 0 : _b.translatedText;
        if (translatedText &&
            typeof translatedText === 'string' &&
            !translatedText.startsWith('QUERY LENGTH LIMIT EXCEEDED') &&
            !translatedText.startsWith('MYMEMORY WARNING') &&
            !translatedText.includes('IS AN INVALID TARGET LANGUAGE') &&
            translatedText.trim() !== '') {
            const decoded = decodeHTMLEntities(translatedText.trim());
            // If translated successfully and different from original, return
            if (decoded.toLowerCase() !== clean.toLowerCase() || clean.split(/\s+/).length <= 2) {
                return decoded;
            }
        }
    }
    catch (error) {
        // MyMemory failed, try Google
    }
    // 2. Try @vitalets/google-translate-api
    try {
        const res = await (0, google_translate_api_1.translate)(clean, {
            from: fromLang === 'auto' ? undefined : fromLang,
            to: toLang,
        });
        if ((res === null || res === void 0 ? void 0 : res.text) && res.text.trim() !== '') {
            return decodeHTMLEntities(res.text.trim());
        }
    }
    catch (error) {
        // Suppress warning if secondary providers succeed
    }
    // 3. Try Google GTX web endpoint
    try {
        const sl = fromLang === 'auto' ? 'auto' : fromLang;
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${toLang}&dt=t&q=${encodeURIComponent(clean)}`;
        const res = await axios_1.default.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 5000
        });
        if (res.data && res.data[0] && res.data[0][0] && res.data[0][0][0]) {
            const fullText = res.data[0].map((item) => item[0]).filter(Boolean).join('');
            if (fullText.trim()) {
                return decodeHTMLEntities(fullText.trim());
            }
        }
    }
    catch (e) { }
    // 4. Fallback to clean original text
    return clean;
};
exports.translateWithFallback = translateWithFallback;
/**
 * Checks if a string has strong Spanish markers.
 * Covers accented chars, common words, AND Puerto Rico place name patterns.
 */
const isSpanishText = (text) => {
    if (!text)
        return false;
    // Fast path: Spanish-only characters
    if (/[áéíóúñü¿¡]/i.test(text))
        return true;
    // Common Spanish function words and place-name prefixes
    return /\b(el|la|los|las|un|una|unos|unas|y|o|pero|para|por|en|con|de|del|al|es|son|este|esta|estos|estas|playa|rio|montana|bosque|cascada|sendero|ruta|restaurante|comida|cueva|cabana|mirador|faro|puerto|isla|punta|bahia|pueblo|ciudad|ruinas|antigua|antiguo|parroquia|catedral|iglesia|ermita|hacienda|central|puente|tunel|fortín|fortin|muelle|cuartel|capilla|cementerio|monumento|palacio|museo|parque|reserva|laguna|cascada|barco|avion|bolera|polvorin|aljibe|locomotora|baluarte|bastion|bateria|garita|bunker|ingenio|chimenea)\b/i.test(text);
};
exports.isSpanishText = isSpanishText;
/**
 * Ensures a field is converted to { en, es }.
 * If only one language is provided or a legacy string is passed,
 * auto-translates to the missing language via multi-provider translation pipeline.
 */
const autoTranslateField = async (input) => {
    if (!input) {
        return { en: '', es: '' };
    }
    // If already an object containing both en and es, return as-is or translate missing side
    if (typeof input === 'object' && input !== null) {
        const enVal = (input.en || '').trim();
        const esVal = (input.es || '').trim();
        if (enVal && esVal) {
            if (enVal === esVal && (0, exports.isSpanishText)(esVal)) {
                const translatedEn = await (0, exports.translateWithFallback)(esVal, 'en', 'es');
                return { es: esVal, en: translatedEn };
            }
            else if (enVal === esVal && !(0, exports.isSpanishText)(enVal)) {
                const translatedEs = await (0, exports.translateWithFallback)(enVal, 'es', 'en');
                return { en: enVal, es: translatedEs };
            }
            return { en: enVal, es: esVal };
        }
        if (esVal && !enVal) {
            const translated = await (0, exports.translateWithFallback)(esVal, 'en', 'es');
            return { es: esVal, en: translated };
        }
        if (enVal && !esVal) {
            const translated = await (0, exports.translateWithFallback)(enVal, 'es', 'en');
            return { en: enVal, es: translated };
        }
        return { en: '', es: '' };
    }
    const text = typeof input === 'string' ? input.trim() : '';
    if (!text) {
        return { en: '', es: '' };
    }
    // Detect source language and translate to the target
    if ((0, exports.isSpanishText)(text)) {
        const translatedEn = await (0, exports.translateWithFallback)(text, 'en', 'es');
        return {
            es: text,
            en: translatedEn,
        };
    }
    else {
        const translatedEs = await (0, exports.translateWithFallback)(text, 'es', 'en');
        return {
            en: text,
            es: translatedEs,
        };
    }
};
exports.autoTranslateField = autoTranslateField;
