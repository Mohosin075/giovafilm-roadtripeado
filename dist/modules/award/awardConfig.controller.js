"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwardConfigController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const awardConfig_service_1 = require("./awardConfig.service");
const getAllAwardConfigs = (0, catchAsync_1.default)(async (req, res) => {
    const result = await awardConfig_service_1.AwardConfigServices.getAllAwardConfigs();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Award configurations retrieved successfully',
        data: result,
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
    const result = await awardConfig_service_1.AwardConfigServices.updateAwardConfig(id, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Award configuration updated successfully',
        data: result,
    });
});
exports.AwardConfigController = {
    getAllAwardConfigs,
    updateAwardConfig,
};
