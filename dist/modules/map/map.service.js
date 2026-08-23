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
    // Select only the fields needed for the list view — do NOT populate places (it's huge)
    // rating and totalReview are stored on the Map document itself and updated by review hooks
    const mapQuery = new QueryBuilder_1.default(map_model_1.Map.find().select('-places'), query)
        .search(map_constants_1.mapSearchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = await mapQuery.modelQuery;
    const meta = await mapQuery.getPaginationInfo();
    // Fetch only the place counts for these maps in a single aggregation (no full populate)
    const fetchedMapIds = result.map((m) => m._id);
    const placeCounts = await place_model_1.Place.aggregate([
        { $match: { map: { $in: fetchedMapIds }, status: 'Published' } },
        { $group: { _id: '$map', count: { $sum: 1 } } },
    ]);
    const placeCountMap = {};
    placeCounts.forEach((pc) => { placeCountMap[pc._id.toString()] = pc.count; });
    const populatedData = result.map((map) => {
        const mapObj = typeof map.toObject === 'function' ? map.toObject() : map;
        mapObj.placeCount = placeCountMap[mapObj._id.toString()] || 0;
        return mapObj;
    });
    return {
        meta,
        data: populatedData,
    };
};
const getMapById = async (id) => {
    // Catalog / purchase UI only needs map summary — places come from discovery
    const result = await map_model_1.Map.findById(id).select('-places').lean();
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Map not found');
    }
    return result;
};
const incrementViewCount = async (id) => {
    const result = await map_model_1.Map.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }, { new: true }).select('name viewCount');
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
    // Paid maps are unlocked only via Stripe checkout / award redeem — not this route
    if (isMapExist.isPaid) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Paid maps must be purchased through checkout');
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
    const user = await user_model_1.User.findById(userId)
        .select('purchasedMaps')
        .populate({
        path: 'purchasedMaps',
        select: 'name country images isActive isPaid price rating totalReview createdAt description',
    })
        .lean();
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found');
    }
    return user.purchasedMaps || [];
};
const getAvailableCountries = async () => {
    const placeCountries = await place_model_1.Place.distinct('country', { status: 'Published' });
    const mapCountries = await map_model_1.Map.distinct('country');
    const combined = Array.from(new Set([...placeCountries, ...mapCountries]));
    return combined.filter((country) => typeof country === 'string' && country !== 'Unknown' && country.trim() !== '');
};
// Marker/list only — no description/media (detail APIs load those on click)
const DISCOVERY_PLACE_FIELDS = 'name type status category map country address rating totalReview location';
const DISCOVERY_BUSINESS_FIELDS = 'name status category location rating totalReview hasActiveSubscription';
const DISCOVERY_MAX_FETCH = 2000;
const getDiscoveryData = async (query, lockedMapIds, isAdminOrEditor = false) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    // Prepare separate queries because Place and Business have different schemas
    const placeQueryObj = { ...query };
    const businessQueryObj = { ...query };
    // 1. Handle "map" filter (Only applicable for Places, map businesses by their country)
    if (businessQueryObj.map) {
        const mapObj = await map_model_1.Map.findById(businessQueryObj.map).select('name country').lean();
        if (mapObj) {
            businessQueryObj['location.country'] = mapObj.country || mapObj.name;
        }
        delete businessQueryObj.map;
    }
    // 2. Handle "country" filter (Business uses location.country)
    if (businessQueryObj.country) {
        businessQueryObj['location.country'] = businessQueryObj.country;
        delete businessQueryObj.country;
    }
    // 3. Handle "status" default if not provided
    if (!placeQueryObj.status) {
        placeQueryObj.status = isAdminOrEditor ? { $in: ['Draft', 'Published'] } : 'Published';
    }
    if (!businessQueryObj.status) {
        businessQueryObj.status = isAdminOrEditor ? { $in: ['Pending', 'Approved', 'Rejected'] } : 'Approved';
    }
    // 4. Enforce that businesses must have an active subscription to show on the map
    if (!isAdminOrEditor) {
        businessQueryObj.hasActiveSubscription = true;
    }
    // Marker/list fields only — detail (media/hours/privateInfo) comes from place/business by id
    const placeQuery = new QueryBuilder_1.default(place_model_1.Place.find()
        .select(DISCOVERY_PLACE_FIELDS)
        .populate('category', 'name color icon status')
        .lean(), placeQueryObj)
        .search(place_constants_1.placeSearchableFields)
        .filter()
        .sort();
    const businessQuery = new QueryBuilder_1.default(business_model_1.Business.find()
        .select(DISCOVERY_BUSINESS_FIELDS)
        .populate('category', 'name color icon status')
        .lean(), businessQueryObj)
        .search(business_constants_1.businessSearchableFields)
        .filter()
        .sort();
    // Honor requested limit (maps page uses ~1000); cap to avoid unbounded scans
    const fetchLimit = Math.min(Math.max(limit, 1), DISCOVERY_MAX_FETCH);
    placeQuery.modelQuery.limit(fetchLimit);
    businessQuery.modelQuery.limit(fetchLimit);
    const [places, businesses] = await Promise.all([
        placeQuery.modelQuery,
        businessQuery.modelQuery,
    ]);
    // Map to include type and isLocked.
    // Keep original Place.type (Business|Regular) as placeType — `type` is overwritten
    // to 'place' so the client can tell Place vs Business collection entities apart.
    const formattedPlaces = places.map(place => {
        var _a;
        const mapId = ((_a = place.map) === null || _a === void 0 ? void 0 : _a._id) || place.map;
        const isLocked = mapId && lockedMapIds && lockedMapIds.includes(mapId.toString()) && place.type !== 'Business';
        return {
            ...place,
            placeType: place.type,
            type: 'place',
            isLocked: !!isLocked,
        };
    });
    const formattedBusinesses = businesses.map(business => {
        var _a, _b, _c, _d;
        return ({
            ...business,
            type: 'business',
            placeType: 'Business',
            location: {
                ...(business.location || {}),
                type: 'Point',
                coordinates: ((_b = (_a = business.location) === null || _a === void 0 ? void 0 : _a.mapLocation) === null || _b === void 0 ? void 0 : _b.coordinates) || [],
            },
            address: ((_c = business.location) === null || _c === void 0 ? void 0 : _c.address) || '',
            country: ((_d = business.location) === null || _d === void 0 ? void 0 : _d.country) || '',
        });
    });
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
    incrementViewCount,
    updateMap,
    deleteMap,
    purchaseMap,
    getPurchasedMaps,
    getAvailableCountries,
    getDiscoveryData,
};
