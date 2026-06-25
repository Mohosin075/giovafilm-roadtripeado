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
const business_model_1 = require("../business/business.model");
const mongoose_1 = __importDefault(require("mongoose"));
const map_constants_1 = require("./map.constants");
const place_constants_1 = require("../place/place.constants");
const business_constants_1 = require("../business/business.constants");
const createMap = async (payload) => {
    const result = await map_model_1.Map.create(payload);
    return result;
};
const getAllMaps = async (query) => {
    let mapIds = [];
    // If category filter is provided, find maps that contain places with those categories
    if (query.category) {
        const categoryIds = query.category.split(',');
        const places = await place_model_1.Place.find({
            category: { $in: categoryIds },
        }).select('map');
        mapIds = places.map(place => place.map);
        // If no places found for these categories, we should return no maps
        if (mapIds.length === 0) {
            return {
                meta: {
                    page: Number(query.page) || 1,
                    limit: Number(query.limit) || 10,
                    total: 0,
                    totalPage: 0,
                },
                data: [],
            };
        }
        // Add map ID filtering to the query
        query._id = { $in: mapIds };
        delete query.category; // Remove category from query as it's not a field in Map model
    }
    const mapQuery = new QueryBuilder_1.default(map_model_1.Map.find().populate({
        path: 'places',
        populate: { path: 'category' },
    }), query)
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
    const result = await map_model_1.Map.findById(id).populate({
        path: 'places',
        populate: { path: 'category' },
    });
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Map not found');
    }
    return result;
};
const updateMap = async (id, payload) => {
    console.log(payload, id);
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
const getAvailableCountries = async () => {
    const result = await place_model_1.Place.distinct('country', { status: 'Published' });
    return result.filter((country) => typeof country === 'string' && country !== 'Unknown');
};
const getDiscoveryData = async (query, lockedMapIds) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    // Prepare separate queries because Place and Business have different schemas
    const placeQueryObj = { ...query };
    const businessQueryObj = { ...query };
    // 1. Handle "map" filter (Only applicable for Places)
    if (businessQueryObj.map) {
        delete businessQueryObj.map;
    }
    // 2. Handle "country" filter (Business uses location.country)
    if (businessQueryObj.country) {
        businessQueryObj['location.country'] = businessQueryObj.country;
        delete businessQueryObj.country;
    }
    // 3. Handle "status" default if not provided
    if (!placeQueryObj.status)
        placeQueryObj.status = 'Published';
    if (!businessQueryObj.status)
        businessQueryObj.status = 'Approved';
    let basePlaceQuery = place_model_1.Place.find();
    if (lockedMapIds && lockedMapIds.length > 0) {
        basePlaceQuery = basePlaceQuery.find({
            $or: [
                { map: { $nin: lockedMapIds } },
                { type: 'Business' }
            ]
        });
    }
    // Use QueryBuilder for Places
    const placeQuery = new QueryBuilder_1.default(basePlaceQuery.populate('category').lean(), placeQueryObj)
        .search(place_constants_1.placeSearchableFields)
        .filter()
        .sort();
    // Use QueryBuilder for Businesses
    const businessQuery = new QueryBuilder_1.default(business_model_1.Business.find().populate('category').lean(), businessQueryObj)
        .search(business_constants_1.businessSearchableFields)
        .filter()
        .sort();
    // We fetch more items and then combine, sort, and paginate in memory 
    // to ensure consistent combined results.
    placeQuery.modelQuery.limit(100);
    businessQuery.modelQuery.limit(100);
    const [places, businesses] = await Promise.all([
        placeQuery.modelQuery,
        businessQuery.modelQuery,
    ]);
    // Map to include type
    const formattedPlaces = places.map(place => ({
        ...place,
        type: 'place',
    }));
    const formattedBusinesses = businesses.map(business => ({
        ...business,
        type: 'business',
    }));
    // Combine results
    let result = [...formattedPlaces, ...formattedBusinesses];
    // If there's a searchTerm, we might want to sort by relevance or alphabetically
    if (query.searchTerm) {
        result.sort((a, b) => a.name.localeCompare(b.name));
    }
    else if (query.sort) {
        // Basic sorting on combined results if needed
        const isDesc = query.sort.startsWith('-');
        const sortField = query.sort.replace('-', '');
        result.sort((a, b) => {
            if (a[sortField] < b[sortField])
                return isDesc ? 1 : -1;
            if (a[sortField] > b[sortField])
                return isDesc ? -1 : 1;
            return 0;
        });
    }
    // Apply pagination on the combined data
    const total = result.length;
    const totalPage = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    result = result.slice(skip, skip + limit);
    return {
        meta: {
            page,
            limit,
            total,
            totalPage,
        },
        data: result,
    };
};
exports.MapService = {
    createMap,
    getAllMaps,
    getMapById,
    updateMap,
    deleteMap,
    purchaseMap,
    getPurchasedMaps,
    getAvailableCountries,
    getDiscoveryData,
};
