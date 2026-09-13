"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.languageMiddleware = void 0;
/**
 * Middleware to extract preferred language ('en' | 'es') from:
 * 1. Query parameter `?lang=en` or `?lang=es`
 * 2. Header `Accept-Language: en` or `Accept-Language: es`
 * Defaults to 'es' (since existing project data & primary audience is Spanish).
 */
const languageMiddleware = (req, res, next) => {
    var _a, _b;
    const queryLang = (_a = req.query.lang) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    const acceptLang = (_b = req.headers['accept-language']) === null || _b === void 0 ? void 0 : _b.toLowerCase();
    let selectedLang = 'es';
    if (queryLang === 'en' || queryLang === 'es') {
        selectedLang = queryLang;
    }
    else if (acceptLang) {
        if (acceptLang.startsWith('en')) {
            selectedLang = 'en';
        }
        else if (acceptLang.startsWith('es')) {
            selectedLang = 'es';
        }
    }
    req.lang = selectedLang;
    next();
};
exports.languageMiddleware = languageMiddleware;
