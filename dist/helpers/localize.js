"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.localizeDocument = exports.localizeField = void 0;
const legacyDifficultyMap = {
    easy: { en: 'Easy', es: 'Fácil' },
    moderate: { en: 'Moderate', es: 'Moderado' },
    hard: { en: 'Hard', es: 'Difícil' },
    fácil: { en: 'Easy', es: 'Fácil' },
    facil: { en: 'Easy', es: 'Fácil' },
    moderado: { en: 'Moderate', es: 'Moderado' },
    difícil: { en: 'Hard', es: 'Difícil' },
    dificil: { en: 'Hard', es: 'Difícil' },
};
/**
 * Safely extracts a single localized string for the requested language ('en' | 'es').
 * Handles legacy string fields (backward compatibility), nulls, and fallback order.
 */
const localizeField = (field, lang = 'es') => {
    if (field === null || field === undefined)
        return '';
    // Legacy DB compatibility: if field is a plain string
    if (typeof field === 'string') {
        const lower = field.trim().toLowerCase();
        if (legacyDifficultyMap[lower]) {
            return legacyDifficultyMap[lower][lang];
        }
        return field;
    }
    // If object { en, es }
    if (typeof field === 'object') {
        const primary = field[lang];
        const fallback = lang === 'es' ? field.en : field.es;
        return primary || fallback || field.es || field.en || '';
    }
    return String(field);
};
exports.localizeField = localizeField;
/**
 * Recursively localizes specified fields on a document or array of documents.
 * Preserves all other document properties untouched.
 */
const localizeDocument = (data, lang = 'es', fields = []) => {
    if (!data)
        return data;
    if (Array.isArray(data)) {
        return data.map(item => (0, exports.localizeDocument)(item, lang, fields));
    }
    // Handle Mongoose Lean or Document objects
    const obj = typeof data.toObject === 'function' ? data.toObject() : { ...data };
    fields.forEach(fieldPath => {
        // Handle nested paths like "recommendations.tips" or "accessibility.notes"
        if (fieldPath.includes('.')) {
            const parts = fieldPath.split('.');
            let current = obj;
            for (let i = 0; i < parts.length - 1; i++) {
                if (!current || typeof current !== 'object')
                    break;
                current = current[parts[i]];
            }
            const lastKey = parts[parts.length - 1];
            if (current && current[lastKey] !== undefined) {
                current[lastKey] = (0, exports.localizeField)(current[lastKey], lang);
            }
        }
        else if (obj[fieldPath] !== undefined) {
            if (Array.isArray(obj[fieldPath])) {
                // e.g. features: [{ en, es }, { en, es }] or string[]
                obj[fieldPath] = obj[fieldPath].map((item) => (0, exports.localizeField)(item, lang));
            }
            else {
                obj[fieldPath] = (0, exports.localizeField)(obj[fieldPath], lang);
            }
        }
    });
    return obj;
};
exports.localizeDocument = localizeDocument;
