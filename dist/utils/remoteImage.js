"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadImageToUploads = exports.isRemoteManagedImage = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const MAX_IMAGE_WIDTH = 1000;
/**
 * Hosts whose image URLs cannot be stored long term: Google photo links carry
 * an API key and a reference that expires, so the browser eventually gets 403.
 */
const REMOTE_IMAGE_HOSTS = [
    'maps.googleapis.com',
    'places.googleapis.com',
    'lh3.googleusercontent.com',
    'lh4.googleusercontent.com',
    'lh5.googleusercontent.com',
    'mymaps.usercontent.google.com',
    'streetviewpixels-pa.googleapis.com',
];
const isRemoteManagedImage = (url) => {
    if (typeof url !== 'string' || !url.trim())
        return false;
    try {
        const { hostname } = new URL(url.trim());
        return REMOTE_IMAGE_HOSTS.includes(hostname);
    }
    catch (_a) {
        return false;
    }
};
exports.isRemoteManagedImage = isRemoteManagedImage;
const extensionFor = (contentType) => {
    if (contentType.includes('png'))
        return 'png';
    if (contentType.includes('webp'))
        return 'webp';
    return 'jpg';
};
const encodeFor = (instance, extension) => {
    if (extension === 'png')
        return instance.png({ quality: 80, compressionLevel: 6 });
    if (extension === 'webp')
        return instance.webp({ quality: 80 });
    return instance.jpeg({ quality: 80, mozjpeg: true });
};
/**
 * Downloads a remote image and stores it under uploads/images.
 * @returns the public path (e.g. /uploads/images/123.jpg) or null when it fails
 */
const downloadImageToUploads = async (url) => {
    var _a;
    try {
        const response = await axios_1.default.get(url, {
            responseType: 'arraybuffer',
            timeout: 20000,
            maxRedirects: 5,
            validateStatus: status => status >= 200 && status < 300,
        });
        const contentType = String(response.headers['content-type'] || '');
        if (!contentType.startsWith('image/')) {
            console.error(`Not an image (${contentType || 'unknown type'}): ${url}`);
            return null;
        }
        const buffer = Buffer.from(response.data);
        if (!buffer.length)
            return null;
        const extension = extensionFor(contentType);
        // Always re-encode: remote originals are often 3-5x bigger than needed.
        const encoded = await encodeFor((0, sharp_1.default)(buffer).resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true }), extension).toBuffer();
        const output = encoded.length < buffer.length ? encoded : buffer;
        const uploadsDir = path_1.default.join(process.cwd(), 'uploads', 'images');
        if (!fs_1.default.existsSync(uploadsDir)) {
            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
        }
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
        fs_1.default.writeFileSync(path_1.default.join(uploadsDir, filename), output);
        return `/uploads/images/${filename}`;
    }
    catch (error) {
        console.error(`Download failed (${((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) || (error === null || error === void 0 ? void 0 : error.message)}): ${url}`);
        return null;
    }
};
exports.downloadImageToUploads = downloadImageToUploads;
