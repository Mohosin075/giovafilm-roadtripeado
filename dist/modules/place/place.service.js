"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaceService = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const place_model_1 = require("./place.model");
const map_model_1 = require("../map/map.model");
const category_model_1 = require("../category/category.model");
const mongoose_1 = __importDefault(require("mongoose"));
const reverseGeocoding_1 = require("../../utils/reverseGeocoding");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toNumber = (value) => {
    const parsed = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
    return Number.isFinite(parsed) ? parsed : NaN;
};
const createPlace = async (payload) => {
    var _a;
    const session = await mongoose_1.default.startSession();
    try {
        session.startTransaction();
        // Auto-populate country if not provided
        if (!payload.country && ((_a = payload.location) === null || _a === void 0 ? void 0 : _a.coordinates)) {
            const [lng, lat] = payload.location.coordinates;
            // MongoDB stores [lng, lat], but Google API needs (lat, lng)
            const country = await (0, reverseGeocoding_1.getCountryFromCoordinates)(lat, lng);
            console.log('country', country);
            if (country) {
                payload.country = country;
            }
            else {
                payload.country = 'Unknown'; // Fallback
            }
        }
        // Check if map exists
        const map = await map_model_1.Map.findById(payload.map).session(session);
        if (!map) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Map not found');
        }
        const result = await place_model_1.Place.create([payload], { session });
        const createdPlace = result[0];
        // Add place to map
        await map_model_1.Map.findByIdAndUpdate(payload.map, {
            $push: { places: createdPlace._id },
            // If map doesn't have a country, set it from the place
            $set: { country: createdPlace.country }
        }, { session });
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
    const searchTerm = typeof query.searchTerm === 'string' ? query.searchTerm.trim() : '';
    const lat = toNumber(query.lat);
    const lng = toNumber(query.lng);
    const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);
    const sort = typeof query.sort === 'string' && query.sort.trim()
        ? query.sort.trim()
        : '-createdAt';
    const limit = Number(query.limit) || 10;
    const page = Number(query.page) || 1;
    const skip = (page - 1) * limit;
    const match = {};
    for (const key of ['status', 'map', 'country', 'category', 'type']) {
        const value = query[key];
        if (typeof value === 'string' && value.trim() && value !== 'undefined') {
            match[key] = value.includes(',') ? { $in: value.split(',') } : value;
        }
    }
    if (searchTerm) {
        const regex = new RegExp(escapeRegex(searchTerm), 'i');
        const matchingCategories = await category_model_1.Category.find({ name: regex })
            .select('_id')
            .lean();
        const or = [
            { name: regex },
            { address: regex },
            { country: regex },
        ];
        if (matchingCategories.length > 0) {
            or.push({ category: { $in: matchingCategories.map(c => c._id) } });
        }
        match.$or = or;
    }
    const total = await place_model_1.Place.countDocuments(match);
    let findQuery = place_model_1.Place.find(hasGeo
        ? {
            ...match,
            location: {
                $nearSphere: {
                    $geometry: { type: 'Point', coordinates: [lng, lat] },
                },
            },
        }
        : match)
        .populate('category', 'name color icon status')
        .populate('map', 'name country status isPaid')
        .lean();
    if (!hasGeo) {
        findQuery = findQuery.sort(sort);
    }
    const data = await findQuery.skip(skip).limit(limit);
    return {
        meta: {
            total,
            page,
            limit,
            totalPage: Math.ceil(total / limit) || 0,
        },
        data,
    };
};
const getPlaceById = async (id) => {
    const result = await place_model_1.Place.findByIdAndUpdate(id, { $inc: { openCount: 1 } }, { new: true }).populate('category').populate('map');
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Place not found');
    }
    return result;
};
const updatePlace = async (id, payload) => {
    var _a;
    const isExist = await place_model_1.Place.findById(id);
    if (!isExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Place not found');
    }
    const session = await mongoose_1.default.startSession();
    try {
        session.startTransaction();
        // Auto-populate country if coordinates are updated but country is not
        if (((_a = payload.location) === null || _a === void 0 ? void 0 : _a.coordinates) && !payload.country) {
            const [lng, lat] = payload.location.coordinates;
            const country = await (0, reverseGeocoding_1.getCountryFromCoordinates)(lat, lng);
            if (country) {
                payload.country = country;
            }
        }
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
