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
const createPlace = async (payload) => {
    const result = await place_model_1.Place.create(payload);
    return result;
};
const getAllPlaces = async (query) => {
    const placeQuery = new QueryBuilder_1.default(place_model_1.Place.find().populate('category'), query)
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
    const result = await place_model_1.Place.findById(id).populate('category');
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
    const result = await place_model_1.Place.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    }).populate('category');
    return result;
};
const deletePlace = async (id) => {
    const isExist = await place_model_1.Place.findById(id);
    if (!isExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Place not found');
    }
    const result = await place_model_1.Place.findByIdAndDelete(id);
    return result;
};
exports.PlaceService = {
    createPlace,
    getAllPlaces,
    getPlaceById,
    updatePlace,
    deletePlace,
};
