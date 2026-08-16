"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCoordinatesFromUrl = exports.parseCoordinatesFromMapsUrl = void 0;
const axios_1 = __importDefault(require("axios"));
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
};
const isShortMapsUrl = (url) => /maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/maps/i.test(url);
const cleanMapsUrl = (rawUrl) => decodeURIComponent(rawUrl.replace(/[\u200B-\u200D\uFEFF]/g, '').trim())
    .replace(/,\s*\+/g, ',')
    .replace(/\+/g, ' ');
const COORD_PATTERNS = [
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /[?&](?:q|query|ll|center)=(-?\d+\.\d+)[, ]+(-?\d+\.\d+)/i,
    /\/maps\/(?:search|place)\/(-?\d+\.\d+)[, ]+(-?\d+\.\d+)/i,
    /\/dir\/(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&](?:destination|origin)=(-?\d+\.\d+),(-?\d+\.\d+)/i,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
];
const parseCoordinatesFromMapsUrl = (rawUrl) => {
    if (!rawUrl)
        return null;
    const candidates = [cleanMapsUrl(rawUrl), rawUrl.trim()];
    for (const url of candidates) {
        for (const regex of COORD_PATTERNS) {
            const match = url.match(regex);
            if (!match)
                continue;
            const lat = Number(match[1]);
            const lng = Number(match[2]);
            if (Number.isFinite(lat) &&
                Number.isFinite(lng) &&
                Math.abs(lat) <= 90 &&
                Math.abs(lng) <= 180) {
                return { lat, lng };
            }
        }
    }
    return null;
};
exports.parseCoordinatesFromMapsUrl = parseCoordinatesFromMapsUrl;
const expandShortUrl = async (startUrl) => {
    var _a, _b, _c, _d, _e, _f;
    let current = startUrl.trim();
    for (let i = 0; i < 8; i++) {
        try {
            const response = await axios_1.default.get(current, {
                maxRedirects: 0,
                timeout: 12000,
                validateStatus: status => status >= 200 && status < 400,
                headers: BROWSER_HEADERS,
            });
            const location = (_a = response.headers) === null || _a === void 0 ? void 0 : _a.location;
            if (location && response.status >= 300 && response.status < 400) {
                current = new URL(location, current).toString();
                if ((0, exports.parseCoordinatesFromMapsUrl)(current))
                    return current;
                continue;
            }
            return (((_c = (_b = response.request) === null || _b === void 0 ? void 0 : _b.res) === null || _c === void 0 ? void 0 : _c.responseUrl) ||
                ((_d = response.request) === null || _d === void 0 ? void 0 : _d.responseURL) ||
                current);
        }
        catch (error) {
            const location = (_f = (_e = error === null || error === void 0 ? void 0 : error.response) === null || _e === void 0 ? void 0 : _e.headers) === null || _f === void 0 ? void 0 : _f.location;
            if (location) {
                current = new URL(location, current).toString();
                if ((0, exports.parseCoordinatesFromMapsUrl)(current))
                    return current;
                continue;
            }
            break;
        }
    }
    return current;
};
/**
 * Resolves any Google Maps link (short or long) and extracts latitude and longitude.
 */
const getCoordinatesFromUrl = async (mapUrl) => {
    try {
        let url = (mapUrl || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
        if (!url)
            return null;
        if (!/^https?:\/\//i.test(url))
            url = `https://${url}`;
        const direct = (0, exports.parseCoordinatesFromMapsUrl)(url);
        if (direct)
            return direct;
        if (isShortMapsUrl(url)) {
            const expanded = await expandShortUrl(url);
            return (0, exports.parseCoordinatesFromMapsUrl)(expanded);
        }
        return null;
    }
    catch (error) {
        console.error('Error resolving Google Maps URL:', error.message || error);
        return null;
    }
};
exports.getCoordinatesFromUrl = getCoordinatesFromUrl;
