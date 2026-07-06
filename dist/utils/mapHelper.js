"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCoordinatesFromUrl = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Resolves any Google Maps link (short or long) and extracts latitude and longitude.
 * Supports:
 * - Shortened URLs: maps.app.goo.gl, goo.gl/maps
 * - Standard long URL coordinates format: @lat,lng
 * - Param-based coordinates formats: q=lat,lng, query=lat,lng, ll=lat,lng
 *
 * @param mapUrl Google Maps URL
 * @returns Object with lat and lng, or null if extraction fails
 */
const getCoordinatesFromUrl = async (mapUrl) => {
    var _a, _b, _c;
    let url = mapUrl;
    try {
        // 1. If it's a short link, follow redirects to get the final expanded URL
        if (url.includes('maps.app.goo.gl') || url.includes('goo.gl/maps')) {
            const response = await axios_1.default.get(url, {
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
            });
            url = ((_b = (_a = response.request) === null || _a === void 0 ? void 0 : _a.res) === null || _b === void 0 ? void 0 : _b.responseUrl) || ((_c = response.headers) === null || _c === void 0 ? void 0 : _c.location) || url;
        }
        // 2. Try matching coordinates using regex patterns
        // Matches @23.7808875,90.2680875
        const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
        let match = url.match(regex);
        if (match) {
            return {
                lat: parseFloat(match[1]),
                lng: parseFloat(match[2]),
            };
        }
        // Matches ?q=23.7808875,90.2680875, query=..., ll=...
        const paramRegex = /[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/;
        match = url.match(paramRegex);
        if (match) {
            return {
                lat: parseFloat(match[1]),
                lng: parseFloat(match[2]),
            };
        }
        return null;
    }
    catch (error) {
        console.error('Error resolving Google Maps URL:', error.message || error);
        return null;
    }
};
exports.getCoordinatesFromUrl = getCoordinatesFromUrl;
