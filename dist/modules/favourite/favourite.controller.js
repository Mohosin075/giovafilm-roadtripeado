"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavouriteController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const favourite_service_1 = require("./favourite.service");
const toggleFavourite = (0, catchAsync_1.default)(async (req, res) => {
    const userId = req.user.authId;
    const result = await favourite_service_1.FavouriteService.toggleFavourite(userId, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: result ? 'Added to favourites' : 'Removed from favourites',
        data: result,
    });
});
const getMyFavourites = (0, catchAsync_1.default)(async (req, res) => {
    const userId = req.user.authId;
    const result = await favourite_service_1.FavouriteService.getMyFavourites(userId, req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Favourites retrieved successfully',
        meta: result.meta,
        data: result.data,
    });
});
const removeFavourite = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.authId;
    const result = await favourite_service_1.FavouriteService.removeFavourite(id, userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Favourite removed successfully',
        data: result,
    });
});
exports.FavouriteController = {
    toggleFavourite,
    getMyFavourites,
    removeFavourite,
};
