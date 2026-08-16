"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeMediaList = exports.isUsableMediaUrl = exports.toStringArray = void 0;
const toStringArray = (value) => {
    if (!value)
        return [];
    if (Array.isArray(value)) {
        return value.flatMap(item => (0, exports.toStringArray)(item));
    }
    if (typeof value === 'string' && value.trim()) {
        return [value.trim()];
    }
    if (typeof value === 'object') {
        const rec = value;
        const path = rec.url || rec.path || rec.src;
        return typeof path === 'string' && path.trim() ? [path.trim()] : [];
    }
    return [];
};
exports.toStringArray = toStringArray;
const isUsableMediaUrl = (url) => {
    if (!url || typeof url !== 'string')
        return false;
    const path = url.trim();
    return Boolean(path && path !== 'undefined' && path !== 'null');
};
exports.isUsableMediaUrl = isUsableMediaUrl;
const sanitizeMediaList = (media) => (0, exports.toStringArray)(media).filter(exports.isUsableMediaUrl);
exports.sanitizeMediaList = sanitizeMediaList;
