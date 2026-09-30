"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwardConfigController = void 0;
const http_status_codes_1 = require("http-status-codes");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const awardConfig_service_1 = require("./awardConfig.service");
const awardConfig_model_1 = require("./awardConfig.model");
const localize_1 = require("../../helpers/localize");
const awardFields = ['title', 'description'];
const getAllAwardConfigs = (0, catchAsync_1.default)(async (req, res) => {
    const result = await awardConfig_service_1.AwardConfigServices.getAllAwardConfigs();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Award configurations retrieved successfully',
        data: (0, localize_1.localizeDocument)(result, req.lang, awardFields),
    });
});
const updateAwardConfig = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    // Process uploaded files if present
    if (req.body.icon) {
        req.body.coverPhoto = req.body.icon;
    }
    if (req.body.documents) {
        // If documents is an array, take the first item, otherwise use it directly
        req.body.fileUrl = Array.isArray(req.body.documents)
            ? req.body.documents[0]
            : req.body.documents;
    }
    if (req.body.fileUrl === '') {
        req.body.originalFileName = '';
    }
    const result = await awardConfig_service_1.AwardConfigServices.updateAwardConfig(id, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Award configuration updated successfully',
        data: (0, localize_1.localizeDocument)(result, req.lang, awardFields),
    });
});
const createAwardConfig = (0, catchAsync_1.default)(async (req, res) => {
    if (req.body.icon) {
        req.body.coverPhoto = req.body.icon;
    }
    if (req.body.documents) {
        req.body.fileUrl = Array.isArray(req.body.documents)
            ? req.body.documents[0]
            : req.body.documents;
    }
    const result = await awardConfig_service_1.AwardConfigServices.createAwardConfig(req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Award configuration created successfully',
        data: (0, localize_1.localizeDocument)(result, req.lang, awardFields),
    });
});
const deleteAwardConfig = (0, catchAsync_1.default)(async (req, res) => {
    const result = await awardConfig_service_1.AwardConfigServices.deleteAwardConfig(req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Award configuration deleted successfully',
        data: result,
    });
});
const downloadAwardPdf = (0, catchAsync_1.default)(async (req, res) => {
    var _a, _b;
    const { id } = req.params;
    const config = await awardConfig_model_1.AwardConfig.findById(id);
    if (!config || !config.fileUrl) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Downloadable file not found for this reward');
    }
    // Determine original filename
    let filename = config.originalFileName;
    if (!filename) {
        const rawTitle = typeof config.title === 'object'
            ? ((_a = config.title) === null || _a === void 0 ? void 0 : _a.es) || ((_b = config.title) === null || _b === void 0 ? void 0 : _b.en) || 'Itinerario'
            : config.title || 'Itinerario';
        filename = `${String(rawTitle)
            .replace(/[^a-zA-Z0-9_\-\s]/g, '')
            .trim()
            .replace(/\s+/g, '_')}.pdf`;
    }
    if (!filename.toLowerCase().endsWith('.pdf')) {
        filename += '.pdf';
    }
    const relativePath = config.fileUrl.startsWith('/') ? config.fileUrl.slice(1) : config.fileUrl;
    const fullPath = path_1.default.join(process.cwd(), relativePath);
    if (fs_1.default.existsSync(fullPath)) {
        return res.download(fullPath, filename);
    }
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    return res.redirect(config.fileUrl);
});
exports.AwardConfigController = {
    getAllAwardConfigs,
    updateAwardConfig,
    createAwardConfig,
    deleteAwardConfig,
    downloadAwardPdf,
};
