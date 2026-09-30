"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LevelConfigController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const levelConfig_service_1 = require("./levelConfig.service");
const localize_1 = require("../../helpers/localize");
const levelFields = ['name', 'description'];
const getAllLevelConfigs = (0, catchAsync_1.default)(async (req, res) => {
    const result = await levelConfig_service_1.LevelConfigServices.getAllLevelConfigs();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Level configurations retrieved successfully',
        data: (0, localize_1.localizeDocument)(result, req.lang, levelFields),
    });
});
const updateLevelConfig = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    if (req.body.icon) {
        req.body.badgeUrl = req.body.icon;
    }
    const result = await levelConfig_service_1.LevelConfigServices.updateLevelConfig(id, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Level configuration updated successfully',
        data: (0, localize_1.localizeDocument)(result, req.lang, levelFields),
    });
});
const createLevelConfig = (0, catchAsync_1.default)(async (req, res) => {
    if (req.body.icon) {
        req.body.badgeUrl = req.body.icon;
    }
    const result = await levelConfig_service_1.LevelConfigServices.createLevelConfig(req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Level configuration created successfully',
        data: (0, localize_1.localizeDocument)(result, req.lang, levelFields),
    });
});
const deleteLevelConfig = (0, catchAsync_1.default)(async (req, res) => {
    const result = await levelConfig_service_1.LevelConfigServices.deleteLevelConfig(req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Level configuration deleted successfully',
        data: result,
    });
});
exports.LevelConfigController = {
    getAllLevelConfigs,
    updateLevelConfig,
    createLevelConfig,
    deleteLevelConfig,
};
