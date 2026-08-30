"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileAndBodyProcessorUsingDiskStorage = exports.fileAndBodyProcessor = void 0;
const multer_1 = __importDefault(require("multer"));
const ApiError_1 = __importDefault(require("../errors/ApiError"));
const http_status_codes_1 = require("http-status-codes");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
const MAX_UPLOAD_SIZE_MB = Number(process.env.SERVER_UPLOAD_MAX_FILE_SIZE_MB || '200');
const MAX_UPLOAD_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const VIDEO_MIME_TYPES = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/3gpp',
    'video/3gpp2',
    'video/x-matroska',
    'video/x-msvideo',
    'video/avi',
    'video/mpeg',
    'video/x-ms-wmv',
    'video/x-flv',
];
const IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'image/gif',
];
const MIME_EXTENSION = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
    'video/quicktime': 'mov',
    'video/3gpp': '3gp',
    'video/3gpp2': '3g2',
    'video/x-matroska': 'mkv',
    'video/x-msvideo': 'avi',
    'video/avi': 'avi',
    'video/mpeg': 'mpeg',
    'video/x-ms-wmv': 'wmv',
    'video/x-flv': 'flv',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
};
const MAX_IMAGE_WIDTH = 800;
const SKIP_OPTIMIZE_MIME = new Set(['image/gif']);
const getUploadExtension = (file) => {
    const fromName = path_1.default.extname(file.originalname).replace('.', '').toLowerCase();
    if (fromName && /^[a-z0-9]{1,8}$/.test(fromName))
        return fromName;
    return MIME_EXTENSION[file.mimetype] || file.mimetype.split('/')[1] || 'bin';
};
const applyFormat = (instance, mimetype) => {
    if (mimetype === 'image/png')
        return instance.png({ quality: 80, compressionLevel: 6 });
    if (mimetype === 'image/webp')
        return instance.webp({ quality: 80 });
    return instance.jpeg({ quality: 80, mozjpeg: true });
};
const shouldOptimizeImage = (fieldName, mimetype) => ['images', 'icon', 'media'].includes(fieldName) &&
    mimetype.startsWith('image/') &&
    !SKIP_OPTIMIZE_MIME.has(mimetype);
const optimizeImageBuffer = async (buffer, mimetype) => {
    const meta = await (0, sharp_1.default)(buffer).metadata();
    if ((meta.width || 0) <= MAX_IMAGE_WIDTH)
        return buffer;
    return applyFormat((0, sharp_1.default)(buffer).resize({
        width: MAX_IMAGE_WIDTH,
        withoutEnlargement: true,
    }), mimetype).toBuffer();
};
const optimizeImageOnDisk = async (fullPath, mimetype) => {
    const meta = await (0, sharp_1.default)(fullPath).metadata();
    if ((meta.width || 0) <= MAX_IMAGE_WIDTH)
        return;
    const optimizedPath = `${fullPath}.optimized`;
    await applyFormat((0, sharp_1.default)(fullPath).resize({
        width: MAX_IMAGE_WIDTH,
        withoutEnlargement: true,
    }), mimetype).toFile(optimizedPath);
    fs_1.default.unlinkSync(fullPath);
    fs_1.default.renameSync(optimizedPath, fullPath);
};
const isMultipart = (req) => String(req.headers['content-type'] || '').includes('multipart/form-data');
const parseEmbeddedJsonData = (req) => {
    var _a;
    if (typeof ((_a = req.body) === null || _a === void 0 ? void 0 : _a.data) === 'string') {
        req.body = JSON.parse(req.body.data);
    }
};
const handleMulterError = (error, next) => {
    if ((error === null || error === void 0 ? void 0 : error.code) === 'LIMIT_FILE_SIZE') {
        return next(new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `File too large. Images and videos can be up to ${MAX_UPLOAD_SIZE_MB}MB.`));
    }
    return next(error);
};
// Define upload configuration with maxCount information
const uploadFields = [
    { name: 'images', maxCount: 10 },
    { name: 'icon', maxCount: 1 },
    { name: 'media', maxCount: 10 },
    { name: 'documents', maxCount: 5 },
];
const fileAndBodyProcessor = () => {
    const storage = multer_1.default.memoryStorage();
    // File filter configuration
    const fileFilter = (req, file, cb) => {
        var _a;
        try {
            const allowedTypes = {
                images: [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES],
                icon: IMAGE_MIME_TYPES,
                media: [
                    ...IMAGE_MIME_TYPES,
                    ...VIDEO_MIME_TYPES,
                    'audio/mpeg',
                    'audio/mp3',
                    'audio/wav',
                    'audio/ogg',
                ],
                documents: ['application/pdf', ...IMAGE_MIME_TYPES],
            };
            const fieldType = file.fieldname;
            const ext = path_1.default.extname(file.originalname).toLowerCase();
            const isVideoByExt = [
                '.mp4',
                '.mov',
                '.webm',
                '.mkv',
                '.avi',
                '.wmv',
                '.flv',
                '.m4v',
                '.3gp',
                '.ogv',
                '.mpeg',
                '.mpg',
            ].includes(ext);
            const mimeOk = (_a = allowedTypes[fieldType]) === null || _a === void 0 ? void 0 : _a.includes(file.mimetype);
            const videoFallback = (fieldType === 'images' || fieldType === 'media') &&
                isVideoByExt &&
                (!file.mimetype ||
                    file.mimetype === 'application/octet-stream' ||
                    file.mimetype.startsWith('video/'));
            if (!mimeOk && !videoFallback) {
                return cb(new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Invalid file type for ${file.fieldname}`));
            }
            cb(null, true);
        }
        catch (error) {
            cb(new ApiError_1.default(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, 'File validation failed'));
        }
    };
    const upload = (0, multer_1.default)({
        storage,
        fileFilter,
        limits: {
            fileSize: MAX_UPLOAD_BYTES,
            files: 20,
        },
    }).fields(uploadFields);
    return (req, res, next) => {
        if (!isMultipart(req)) {
            try {
                parseEmbeddedJsonData(req);
                return next();
            }
            catch (err) {
                return next(err);
            }
        }
        upload(req, res, async (error) => {
            var _a;
            if (error)
                return handleMulterError(error, next);
            try {
                parseEmbeddedJsonData(req);
                // Process uploaded files
                if (req.files) {
                    const processedFiles = {};
                    const fieldsConfig = new Map(uploadFields.map(f => [f.name, f.maxCount]));
                    // Process each uploaded field
                    for (const [fieldName, files] of Object.entries(req.files)) {
                        const maxCount = (_a = fieldsConfig.get(fieldName)) !== null && _a !== void 0 ? _a : 1;
                        const fileArray = files;
                        const paths = [];
                        const uploadsDir = path_1.default.join(process.cwd(), 'uploads', fieldName);
                        if (!fs_1.default.existsSync(uploadsDir)) {
                            fs_1.default.mkdirSync(uploadsDir, { recursive: true });
                        }
                        const savedPaths = await Promise.all(fileArray.map(async (file) => {
                            const extension = getUploadExtension(file);
                            const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
                            const filePath = `/uploads/${fieldName}/${filename}`;
                            if (shouldOptimizeImage(fieldName, file.mimetype)) {
                                try {
                                    file.buffer = await optimizeImageBuffer(file.buffer, file.mimetype);
                                }
                                catch (err) {
                                    console.error('Image optimization failed:', err);
                                }
                            }
                            fs_1.default.writeFileSync(path_1.default.join(uploadsDir, filename), file.buffer);
                            return filePath;
                        }));
                        paths.push(...savedPaths);
                        // Store as array or single value based on maxCount
                        processedFiles[fieldName] = maxCount > 1 ? paths : paths[0];
                    }
                    // Merge arrays instead of overwriting for list fields
                    for (const [fieldName, value] of Object.entries(processedFiles)) {
                        if (Array.isArray(req.body[fieldName]) && Array.isArray(value)) {
                            req.body[fieldName] = [...req.body[fieldName], ...value];
                        }
                        else if (Array.isArray(req.body[fieldName]) && typeof value === 'string') {
                            req.body[fieldName] = [...req.body[fieldName], value];
                        }
                        else {
                            req.body[fieldName] = value;
                        }
                    }
                }
                next();
            }
            catch (err) {
                next(err);
            }
        });
    };
};
exports.fileAndBodyProcessor = fileAndBodyProcessor;
// Utility function to generate random string
function generateRandomString(length = 9) {
    return Math.random()
        .toString(36)
        .slice(2, 2 + length);
}
const fileAndBodyProcessorUsingDiskStorage = () => {
    // Create uploads directory if it doesn't exist
    const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
    if (!fs_1.default.existsSync(uploadsDir)) {
        fs_1.default.mkdirSync(uploadsDir, { recursive: true });
    }
    // Configure storage
    const storage = multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            const folderPath = path_1.default.join(uploadsDir, file.fieldname);
            if (!fs_1.default.existsSync(folderPath)) {
                fs_1.default.mkdirSync(folderPath, { recursive: true });
            }
            cb(null, folderPath);
        },
        filename: (req, file, cb) => {
            const extension = getUploadExtension(file);
            const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
            cb(null, filename);
        },
    });
    // File filter configuration
    const fileFilter = (req, file, cb) => {
        var _a;
        try {
            const allowedTypes = {
                images: [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES],
                icon: IMAGE_MIME_TYPES,
                media: [
                    ...IMAGE_MIME_TYPES,
                    ...VIDEO_MIME_TYPES,
                    'audio/mpeg',
                    'audio/mp3',
                    'audio/wav',
                    'audio/ogg',
                ],
                documents: ['application/pdf', ...IMAGE_MIME_TYPES],
            };
            const fieldType = file.fieldname;
            const ext = path_1.default.extname(file.originalname).toLowerCase();
            const isVideoByExt = [
                '.mp4',
                '.mov',
                '.webm',
                '.mkv',
                '.avi',
                '.wmv',
                '.flv',
                '.m4v',
                '.3gp',
                '.ogv',
                '.mpeg',
                '.mpg',
            ].includes(ext);
            const mimeOk = (_a = allowedTypes[fieldType]) === null || _a === void 0 ? void 0 : _a.includes(file.mimetype);
            const videoFallback = (fieldType === 'images' || fieldType === 'media') &&
                isVideoByExt &&
                (!file.mimetype ||
                    file.mimetype === 'application/octet-stream' ||
                    file.mimetype.startsWith('video/'));
            if (!mimeOk && !videoFallback) {
                return cb(new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Invalid file type for ${file.fieldname}`));
            }
            cb(null, true);
        }
        catch (error) {
            cb(new ApiError_1.default(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, 'File validation failed'));
        }
    };
    const upload = (0, multer_1.default)({
        storage,
        fileFilter,
        limits: {
            fileSize: MAX_UPLOAD_BYTES,
            files: 20,
        },
    }).fields(uploadFields);
    return (req, res, next) => {
        if (!isMultipart(req)) {
            try {
                parseEmbeddedJsonData(req);
                return next();
            }
            catch (err) {
                return next(err);
            }
        }
        upload(req, res, async (error) => {
            var _a;
            if (error)
                return handleMulterError(error, next);
            try {
                parseEmbeddedJsonData(req);
                // Process uploaded files — in disk storage mode, multer already saved the files.
                // We only need to collect their paths and merge into req.body.
                if (req.files) {
                    const processedFiles = {};
                    const fieldsConfig = new Map(uploadFields.map(f => [f.name, f.maxCount]));
                    for (const [fieldName, files] of Object.entries(req.files)) {
                        const maxCount = (_a = fieldsConfig.get(fieldName)) !== null && _a !== void 0 ? _a : 1;
                        const fileArray = files;
                        const paths = fileArray.map(file => {
                            // multer disk storage already saved the file — use file.filename directly
                            const filePath = `/uploads/${fieldName}/${file.filename}`;
                            if (shouldOptimizeImage(fieldName, file.mimetype)) {
                                // Optimize in background so the request doesn't wait
                                optimizeImageOnDisk(path_1.default.join(uploadsDir, fieldName, file.filename), file.mimetype).catch(err => {
                                    console.error('Background image optimization failed:', err);
                                });
                            }
                            return filePath;
                        });
                        // Store as array or single value based on maxCount
                        processedFiles[fieldName] = maxCount > 1 ? paths : paths[0];
                    }
                    // Merge file paths into req.body instead of overwriting
                    for (const [fieldName, value] of Object.entries(processedFiles)) {
                        if (Array.isArray(req.body[fieldName]) && Array.isArray(value)) {
                            req.body[fieldName] = [...req.body[fieldName], ...value];
                        }
                        else if (Array.isArray(req.body[fieldName]) && typeof value === 'string') {
                            req.body[fieldName] = [...req.body[fieldName], value];
                        }
                        else {
                            req.body[fieldName] = value;
                        }
                    }
                }
                next();
            }
            catch (err) {
                next(err);
            }
        });
    };
};
exports.fileAndBodyProcessorUsingDiskStorage = fileAndBodyProcessorUsingDiskStorage;
