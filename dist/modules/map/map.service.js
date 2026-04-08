"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapService = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const map_model_1 = require("./map.model");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const user_model_1 = require("../user/user.model");
const place_model_1 = require("../place/place.model");
const mongoose_1 = __importDefault(require("mongoose"));
const map_constants_1 = require("./map.constants");
const createMap = async (payload) => {
    const result = await map_model_1.Map.create(payload);
    return result;
};
const getAllMaps = async (query) => {
    const mapQuery = new QueryBuilder_1.default(map_model_1.Map.find().populate('places'), query)
        .search(map_constants_1.mapSearchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = await mapQuery.modelQuery;
    const meta = await mapQuery.getPaginationInfo();
    return {
        meta,
        data: result,
    };
};
const getMapById = async (id) => {
    const result = await map_model_1.Map.findById(id).populate('places');
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Map not found');
    }
    return result;
};
const updateMap = async (id, payload) => {
    const isExist = await map_model_1.Map.findById(id);
    if (!isExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Map not found');
    }
    const result = await map_model_1.Map.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });
    return result;
};
const deleteMap = async (id) => {
    const isExist = await map_model_1.Map.findById(id);
    if (!isExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Map not found');
    }
    const session = await mongoose_1.default.startSession();
    try {
        session.startTransaction();
        // 1. Delete the Map
        const result = await map_model_1.Map.findByIdAndDelete(id).session(session);
        // 2. Delete all Places associated with this Map
        await place_model_1.Place.deleteMany({ map: id }).session(session);
        // 3. Remove this map from all users' purchased list
        await user_model_1.User.updateMany({ purchasedMaps: id }, { $pull: { purchasedMaps: id } }, { session });
        await session.commitTransaction();
        return result;
    }
    catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        session.endSession();
    }
};
const purchaseMap = async (userId, mapId) => {
    var _a;
    const isMapExist = await map_model_1.Map.findById(mapId);
    if (!isMapExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Map not found');
    }
    const user = await user_model_1.User.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found');
    }
    // Check if already purchased
    const alreadyPurchased = (_a = user.purchasedMaps) === null || _a === void 0 ? void 0 : _a.some(id => id.toString() === mapId);
    if (alreadyPurchased) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Map already purchased');
    }
    const result = await user_model_1.User.findByIdAndUpdate(userId, { $push: { purchasedMaps: mapId } }, { new: true });
    return result;
};
const getPurchasedMaps = async (userId) => {
    const user = await user_model_1.User.findById(userId).populate({
        path: 'purchasedMaps',
        populate: { path: 'places', populate: { path: 'category' } },
    });
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found');
    }
    return user.purchasedMaps || [];
};
exports.MapService = {
    createMap,
    getAllMaps,
    getMapById,
    updateMap,
    deleteMap,
    purchaseMap,
    getPurchasedMaps,
};
