"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaceService = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const place_model_1 = require("./place.model");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const place_constants_1 = require("./place.constants");
const map_model_1 = require("../map/map.model");
const mongoose_1 = __importDefault(require("mongoose"));
const createPlace = async (payload) => {
    const session = await mongoose_1.default.startSession();
    try {
        session.startTransaction();
        // Check if map exists
        const map = await map_model_1.Map.findById(payload.map).session(session);
        if (!map) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Map not found');
        }
        const result = await place_model_1.Place.create([payload], { session });
        const createdPlace = result[0];
        // Add place to map
        await map_model_1.Map.findByIdAndUpdate(payload.map, { $push: { places: createdPlace._id } }, { session });
        await session.commitTransaction();
        return createdPlace;
    }
    catch (error) {
        await session.abortTransaction();
        throw error;
    }
    finally {
        session.endSession();
    }
};
const getAllPlaces = async (query) => {
    const placeQuery = new QueryBuilder_1.default(place_model_1.Place.find().populate('category').populate('map'), query)
        .search(place_constants_1.placeSearchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = await placeQuery.modelQuery;
    const meta = await placeQuery.getPaginationInfo();
    return {
        meta,
        data: result,
    };
};
const getPlaceById = async (id) => {
    const result = await place_model_1.Place.findById(id).populate('category').populate('map');
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Place not found');
    }
    return result;
};
const updatePlace = async (id, payload) => {
    const isExist = await place_model_1.Place.findById(id);
    if (!isExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Place not found');
    }
    const session = await mongoose_1.default.startSession();
    try {
        session.startTransaction();
        // Handle map change
        if (payload.map && payload.map.toString() !== isExist.map.toString()) {
            // Remove from old map
            await map_model_1.Map.findByIdAndUpdate(isExist.map, { $pull: { places: isExist._id } }, { session });
            // Add to new map
            await map_model_1.Map.findByIdAndUpdate(payload.map, { $push: { places: isExist._id } }, { session });
        }
        const result = await place_model_1.Place.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true,
            session,
        })
            .populate('category')
            .populate('map');
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
const deletePlace = async (id) => {
    const isExist = await place_model_1.Place.findById(id);
    if (!isExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Place not found');
    }
    const session = await mongoose_1.default.startSession();
    try {
        session.startTransaction();
        const result = await place_model_1.Place.findByIdAndDelete(id).session(session);
        // Remove place from map
        if (result && result.map) {
            await map_model_1.Map.findByIdAndUpdate(result.map, { $pull: { places: result._id } }, { session });
        }
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
exports.PlaceService = {
    createPlace,
    getAllPlaces,
    getPlaceById,
    updatePlace,
    deletePlace,
};
