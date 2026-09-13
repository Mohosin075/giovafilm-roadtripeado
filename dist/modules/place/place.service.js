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
const business_model_1 = require("../business/business.model");
const autoTranslate_1 = require("../../utils/autoTranslate");
const place_constants_1 = require("./place.constants");
const mapAccessHelper_1 = require("../../helpers/mapAccessHelper");
const mapHelper_1 = require("../../utils/mapHelper");
const media_1 = require("../../utils/media");
const user_1 = require("../../enum/user");
const processPlaceTranslations = async (payload) => {
    var _a, _b;
    if (payload.name)
        payload.name = await (0, autoTranslate_1.autoTranslateField)(payload.name);
    if (payload.description)
        payload.description = await (0, autoTranslate_1.autoTranslateField)(payload.description);
    if (payload.access)
        payload.access = await (0, autoTranslate_1.autoTranslateField)(payload.access);
    if (payload.entryCost)
        payload.entryCost = await (0, autoTranslate_1.autoTranslateField)(payload.entryCost);
    if (payload.difficulty) {
        if (typeof payload.difficulty === 'string' && place_constants_1.difficultyMap[payload.difficulty]) {
            payload.difficulty = place_constants_1.difficultyMap[payload.difficulty];
        }
        else {
            payload.difficulty = await (0, autoTranslate_1.autoTranslateField)(payload.difficulty);
        }
    }
    if (payload.hikeTime)
        payload.hikeTime = await (0, autoTranslate_1.autoTranslateField)(payload.hikeTime);
    if (payload.atmosphere)
        payload.atmosphere = await (0, autoTranslate_1.autoTranslateField)(payload.atmosphere);
    if ((_a = payload.accessibility) === null || _a === void 0 ? void 0 : _a.notes) {
        payload.accessibility.notes = await (0, autoTranslate_1.autoTranslateField)(payload.accessibility.notes);
    }
    if ((_b = payload.recommendations) === null || _b === void 0 ? void 0 : _b.tips) {
        payload.recommendations.tips = await (0, autoTranslate_1.autoTranslateField)(payload.recommendations.tips);
    }
};
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toNumber = (value) => {
    const parsed = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
    return Number.isFinite(parsed) ? parsed : NaN;
};
const createPlace = async (payload, userOrAuthHeader) => {
    var _a;
    const user = typeof userOrAuthHeader === 'string'
        ? await (0, mapAccessHelper_1.getUserFromToken)(userOrAuthHeader)
        : userOrAuthHeader;
    const placeData = { ...payload };
    const uploadedImages = (0, media_1.toStringArray)(placeData.images);
    const uploadedDocs = (0, media_1.toStringArray)(placeData.documents);
    if (uploadedImages.length || placeData.media) {
        placeData.media = [...(0, media_1.toStringArray)(placeData.media), ...uploadedImages];
    }
    if (uploadedDocs.length || placeData.menuImages) {
        placeData.menuImages = [...(0, media_1.toStringArray)(placeData.menuImages), ...uploadedDocs];
    }
    delete placeData.images;
    delete placeData.documents;
    // A place must belong to a map, verify access
    if (placeData.map) {
        await (0, mapAccessHelper_1.verifyEditorEditAccess)(user, placeData.map.toString());
    }
    // Auto-populate country if not provided (run before transaction/session to prevent locks)
    if (!placeData.country && ((_a = placeData.location) === null || _a === void 0 ? void 0 : _a.coordinates)) {
        const [lng, lat] = placeData.location.coordinates;
        // MongoDB stores [lng, lat], but Google API needs (lat, lng)
        const country = await (0, reverseGeocoding_1.getCountryFromCoordinates)(lat, lng);
        console.log('country', country);
        if (country) {
            placeData.country = country;
        }
        else {
            placeData.country = 'Unknown'; // Fallback
        }
    }
    await processPlaceTranslations(placeData);
    const session = await mongoose_1.default.startSession();
    try {
        session.startTransaction();
        // Check if map exists
        const map = await map_model_1.Map.findById(placeData.map).session(session);
        if (!map) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Map not found');
        }
        const result = await place_model_1.Place.create([placeData], { session });
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
const getAllPlaces = async (query, authHeader) => {
    // Run auth lookup and paid map IDs in parallel to avoid sequential DB hits
    const [user, paidMaps] = await Promise.all([
        (0, mapAccessHelper_1.getUserFromToken)(authHeader),
        map_model_1.Map.find({ isPaid: true }, '_id'),
    ]);
    const accessibleMapIds = await (0, mapAccessHelper_1.getAccessibleMapIds)(user);
    const paidMapIds = paidMaps.map(m => m._id.toString());
    const lockedMapIds = paidMapIds.filter(id => !accessibleMapIds.includes(id));
    const isPremium = user && [user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.MAP_EDITOR].includes(user.role);
    const searchTerm = typeof query.searchTerm === 'string' ? query.searchTerm.trim() : '';
    const lat = toNumber(query.lat);
    const lng = toNumber(query.lng);
    const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);
    const sort = typeof query.sort === 'string' && query.sort.trim()
        ? query.sort
        : '-createdAt';
    const page = Math.max(1, toNumber(query.page) || 1);
    const limit = Math.max(1, toNumber(query.limit) || 10);
    const skip = (page - 1) * limit;
    // 1. Build Place Query
    const match = {};
    if (query.map) {
        match.map = new mongoose_1.default.Types.ObjectId(query.map);
    }
    if (query.category) {
        match.category = new mongoose_1.default.Types.ObjectId(query.category);
    }
    if (query.status) {
        match.status = query.status;
    }
    else {
        match.status = 'Published';
    }
    if (query.country) {
        match.country = new RegExp(`^${escapeRegex(String(query.country).trim())}$`, 'i');
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
    let placeQuery = place_model_1.Place.find(hasGeo
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
        .populate('map', 'name isPaid price')
        .lean();
    if (!hasGeo) {
        placeQuery = placeQuery.sort(sort);
    }
    const places = await placeQuery;
    const formattedPlaces = places.map(p => ({
        ...p,
        _id: p._id.toString(),
        type: 'Regular',
        placeType: 'Regular',
    }));
    // 2. Build Business Query (if type is not strictly 'Regular' and no specific map filter is applied)
    let formattedBusinesses = [];
    if (query.type !== 'Regular' && !query.map) {
        const businessMatch = {};
        if (query.category) {
            businessMatch.category = new mongoose_1.default.Types.ObjectId(query.category);
        }
        if (query.country) {
            businessMatch['location.country'] = new RegExp(`^${escapeRegex(String(query.country).trim())}$`, 'i');
        }
        // Map place statuses to business statuses
        if (match.status) {
            const statusObj = match.status;
            if (statusObj && statusObj.$in) {
                const statuses = statusObj.$in.map((s) => {
                    if (s === 'Published')
                        return 'Approved';
                    if (s === 'Draft')
                        return 'Pending';
                    return s;
                });
                businessMatch.status = { $in: statuses };
            }
            else {
                const statusStr = match.status;
                if (statusStr === 'Published') {
                    businessMatch.status = 'Approved';
                }
                else if (statusStr === 'Draft') {
                    businessMatch.status = 'Pending';
                }
                else {
                    businessMatch.status = statusStr;
                }
            }
        }
        if (searchTerm) {
            const regex = new RegExp(escapeRegex(searchTerm), 'i');
            const matchingCategories = await category_model_1.Category.find({ name: regex })
                .select('_id')
                .lean();
            const or = [
                { name: regex },
                { 'location.address': regex },
                { 'location.country': regex },
            ];
            if (matchingCategories.length > 0) {
                or.push({ category: { $in: matchingCategories.map(c => c._id) } });
            }
            businessMatch.$or = or;
        }
        let businessQuery = business_model_1.Business.find(hasGeo
            ? {
                ...businessMatch,
                'location.mapLocation': {
                    $nearSphere: {
                        $geometry: { type: 'Point', coordinates: [lng, lat] },
                    },
                },
            }
            : businessMatch)
            .populate('category', 'name color icon status')
            .lean();
        if (!hasGeo) {
            businessQuery = businessQuery.sort(sort);
        }
        const businesses = await businessQuery;
        formattedBusinesses = businesses.map(business => {
            var _a, _b, _c, _d, _e, _f, _g;
            let placeStatus = 'Draft';
            if (business.status === 'Approved')
                placeStatus = 'Published';
            else if (business.status === 'Pending')
                placeStatus = 'Draft';
            else
                placeStatus = business.status;
            return {
                ...business,
                _id: business._id.toString(),
                type: 'Business',
                placeType: 'Business',
                status: placeStatus,
                media: ((_a = business.media) === null || _a === void 0 ? void 0 : _a.photos) || [],
                menuImages: ((_b = business.media) === null || _b === void 0 ? void 0 : _b.menu) ? [business.media.menu] : [],
                address: ((_c = business.location) === null || _c === void 0 ? void 0 : _c.address) || '',
                country: ((_d = business.location) === null || _d === void 0 ? void 0 : _d.country) || '',
                location: {
                    type: 'Point',
                    coordinates: ((_f = (_e = business.location) === null || _e === void 0 ? void 0 : _e.mapLocation) === null || _f === void 0 ? void 0 : _f.coordinates) || [],
                },
                map: { name: (_g = business.location) === null || _g === void 0 ? void 0 : _g.country },
            };
        });
    }
    // 3. Combine results
    const combined = [...formattedPlaces, ...formattedBusinesses];
    // Sort combined results if not sorting by geo location distance
    if (!hasGeo) {
        const isDesc = sort.startsWith('-');
        const sortField = sort.replace('-', '');
        combined.sort((a, b) => {
            var _a, _b, _c, _d;
            let valA = a[sortField];
            let valB = b[sortField];
            if (sortField === 'map') {
                valA = ((_a = a.map) === null || _a === void 0 ? void 0 : _a.name) || '';
                valB = ((_b = b.map) === null || _b === void 0 ? void 0 : _b.name) || '';
            }
            else if (sortField === 'category') {
                valA = ((_c = a.category) === null || _c === void 0 ? void 0 : _c.name) || '';
                valB = ((_d = b.category) === null || _d === void 0 ? void 0 : _d.name) || '';
            }
            else if (sortField === 'createdAt') {
                valA = new Date(a.createdAt || 0).getTime();
                valB = new Date(b.createdAt || 0).getTime();
            }
            else {
                valA = a[sortField] || '';
                valB = b[sortField] || '';
            }
            if (valA < valB)
                return isDesc ? 1 : -1;
            if (valA > valB)
                return isDesc ? -1 : 1;
            return 0;
        });
    }
    const total = combined.length;
    const paginatedData = combined.slice(skip, skip + limit);
    const updatedData = paginatedData.map((place) => {
        var _a;
        const mapId = ((_a = place.map) === null || _a === void 0 ? void 0 : _a._id) || place.map;
        const isLocked = !isPremium && mapId && lockedMapIds.includes(mapId.toString()) && place.type !== 'Business';
        if (isLocked) {
            // Keep teaser fields (name/media/category/location) for locked cards
            const { description: _description, hours: _hours, privateInfo: _privateInfo, ...teaser } = place;
            return {
                ...teaser,
                description: undefined,
                hours: undefined,
                privateInfo: undefined,
                isLocked: true,
            };
        }
        return {
            ...place,
            isLocked: false,
        };
    });
    return {
        meta: {
            total,
            page,
            limit,
            totalPage: Math.ceil(total / limit) || 0,
        },
        data: updatedData,
    };
};
const getPlaceById = async (id, authHeader) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const [user, placeDoc] = await Promise.all([
        (0, mapAccessHelper_1.getUserFromToken)(authHeader),
        place_model_1.Place.findById(id).populate('category').populate('map'),
    ]);
    let result = placeDoc;
    if (!result) {
        // Fallback to checking Business collection
        const business = await business_model_1.Business.findById(id).populate('category');
        if (business) {
            // Map Business fields to Place schema so frontend doesn't break
            result = {
                ...business.toObject(),
                type: 'Business',
                placeType: 'Business',
                media: ((_a = business.media) === null || _a === void 0 ? void 0 : _a.photos) || [],
                menuImages: ((_b = business.media) === null || _b === void 0 ? void 0 : _b.menu) ? [business.media.menu] : [],
                address: ((_c = business.location) === null || _c === void 0 ? void 0 : _c.address) || '',
                country: ((_d = business.location) === null || _d === void 0 ? void 0 : _d.country) || '',
                location: {
                    type: 'Point',
                    coordinates: ((_f = (_e = business.location) === null || _e === void 0 ? void 0 : _e.mapLocation) === null || _f === void 0 ? void 0 : _f.coordinates) || [],
                },
                map: { name: (_g = business.location) === null || _g === void 0 ? void 0 : _g.country },
            };
        }
    }
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Place not found');
    }
    const isPremium = user && [user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.MAP_EDITOR].includes(user.role);
    const accessibleMapIds = await (0, mapAccessHelper_1.getAccessibleMapIds)(user);
    const mapId = ((_h = result.map) === null || _h === void 0 ? void 0 : _h._id) || result.map;
    if (mapId) {
        const isLocked = !accessibleMapIds.includes(mapId.toString());
        if (!isPremium && isLocked) {
            if (result.type !== 'Business') {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'This information and these benefits can be unlocked by purchasing your favorite map.');
            }
        }
    }
    const placeObj = typeof result.toObject === 'function' ? result.toObject() : result;
    const isLocked = mapId && !accessibleMapIds.includes(mapId.toString()) && result.type !== 'Business';
    placeObj.isLocked = !isPremium && !!isLocked;
    return placeObj;
};
const incrementOpenCount = async (id) => {
    const result = await place_model_1.Place.findByIdAndUpdate(id, { $inc: { openCount: 1 } }, { new: true }).select('name openCount');
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Place not found');
    }
    return result;
};
const updatePlace = async (id, payload, userOrAuthHeader) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const user = typeof userOrAuthHeader === 'string'
        ? await (0, mapAccessHelper_1.getUserFromToken)(userOrAuthHeader)
        : userOrAuthHeader;
    const placeData = { ...payload };
    const uploadedImages = (0, media_1.toStringArray)(placeData.images);
    const uploadedDocs = (0, media_1.toStringArray)(placeData.documents);
    if (uploadedImages.length || placeData.media) {
        placeData.media = [...(0, media_1.toStringArray)(placeData.media), ...uploadedImages];
    }
    if (uploadedDocs.length || placeData.menuImages) {
        placeData.menuImages = [...(0, media_1.toStringArray)(placeData.menuImages), ...uploadedDocs];
    }
    delete placeData.images;
    delete placeData.documents;
    const isExist = await place_model_1.Place.findById(id);
    if (isExist) {
        // A place must belong to a map, verify access to the existing map
        const mapId = ((_a = isExist.map) === null || _a === void 0 ? void 0 : _a._id) || isExist.map;
        if (mapId) {
            await (0, mapAccessHelper_1.verifyEditorEditAccess)(user, mapId.toString());
        }
        // If they are moving the place to a new map, verify access to the new map too
        if (placeData.map && placeData.map.toString() !== (mapId === null || mapId === void 0 ? void 0 : mapId.toString())) {
            await (0, mapAccessHelper_1.verifyEditorEditAccess)(user, placeData.map.toString());
        }
    }
    await processPlaceTranslations(placeData);
    if (!isExist) {
        // Fallback: Check and update Business collection
        const isBusiness = await business_model_1.Business.findById(id);
        if (!isBusiness) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Place not found');
        }
        // Map payload from Place structure back to Business schema format
        const businessPayload = {};
        if (payload.name)
            businessPayload.name = payload.name;
        if (payload.category)
            businessPayload.category = payload.category;
        if (payload.description)
            businessPayload.description = payload.description;
        // Address & coordinates mapping
        if (payload.address || ((_b = payload.location) === null || _b === void 0 ? void 0 : _b.coordinates)) {
            businessPayload.location = {
                ...(isBusiness.location || {}),
                ...(payload.address && { address: payload.address }),
                ...(((_c = payload.location) === null || _c === void 0 ? void 0 : _c.coordinates) && {
                    mapLocation: {
                        type: 'Point',
                        coordinates: payload.location.coordinates,
                    },
                }),
            };
        }
        // Media mapping
        if (payload.media) {
            businessPayload.media = {
                ...(isBusiness.media || {}),
                photos: payload.media,
            };
        }
        if (payload.menuImages && payload.menuImages.length > 0) {
            businessPayload.media = {
                ...(businessPayload.media || isBusiness.media || {}),
                menu: payload.menuImages[0], // Business schema holds a single string for menu
            };
        }
        // Phone, website, instagram
        if (payload.phone || payload.website || payload.instagram) {
            businessPayload.contact = {
                ...(isBusiness.contact || {}),
                ...(payload.phone && { phone: payload.phone }),
                ...(payload.website && { website: payload.website }),
                ...(payload.instagram && { instagram: payload.instagram }),
            };
        }
        // Hours / Schedule
        if (payload.operatingHours) {
            businessPayload.hours = {
                customHours: true,
                schedule: payload.operatingHours,
            };
        }
        const updatedBusiness = await business_model_1.Business.findByIdAndUpdate(id, businessPayload, {
            new: true,
            runValidators: true,
        }).populate('category');
        // Return mapped to Place schema format
        if (updatedBusiness) {
            return {
                ...updatedBusiness.toObject(),
                type: 'Business',
                placeType: 'Business',
                media: ((_d = updatedBusiness.media) === null || _d === void 0 ? void 0 : _d.photos) || [],
                menuImages: ((_e = updatedBusiness.media) === null || _e === void 0 ? void 0 : _e.menu) ? [updatedBusiness.media.menu] : [],
                address: ((_f = updatedBusiness.location) === null || _f === void 0 ? void 0 : _f.address) || '',
                country: ((_g = updatedBusiness.location) === null || _g === void 0 ? void 0 : _g.country) || '',
                location: {
                    type: 'Point',
                    coordinates: ((_j = (_h = updatedBusiness.location) === null || _h === void 0 ? void 0 : _h.mapLocation) === null || _j === void 0 ? void 0 : _j.coordinates) || [],
                },
                map: { name: (_k = updatedBusiness.location) === null || _k === void 0 ? void 0 : _k.country },
            };
        }
        return null;
    }
    const nextCoords = (_l = payload.location) === null || _l === void 0 ? void 0 : _l.coordinates;
    const prevCoords = (_m = isExist.location) === null || _m === void 0 ? void 0 : _m.coordinates;
    const COORD_EPSILON = 1e-6;
    const coordsChanged = !!nextCoords &&
        (!prevCoords ||
            Math.abs(nextCoords[0] - prevCoords[0]) > COORD_EPSILON ||
            Math.abs(nextCoords[1] - prevCoords[1]) > COORD_EPSILON);
    // Only hit Google when the pin actually moved (run before transaction/session to prevent locks)
    if (coordsChanged && !payload.country) {
        const [lng, lat] = nextCoords;
        const country = await (0, reverseGeocoding_1.getCountryFromCoordinates)(lat, lng);
        if (country) {
            payload.country = country;
        }
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
        const nextMedia = Array.isArray(payload.media)
            ? payload.media.filter(Boolean)
            : undefined;
        if (nextMedia) {
            payload.media = nextMedia.length > 0 ? nextMedia : isExist.media;
        }
        const nextMenu = Array.isArray(payload.menuImages)
            ? payload.menuImages.filter(Boolean)
            : undefined;
        if (nextMenu) {
            payload.menuImages = nextMenu.length > 0 ? nextMenu : isExist.menuImages;
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
        const isBusiness = await business_model_1.Business.findById(id);
        if (!isBusiness) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Place not found');
        }
        return await business_model_1.Business.findByIdAndDelete(id);
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
const extractCoordinates = async (url) => {
    if (!url) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Google Maps URL is required');
    }
    const coordinates = await (0, mapHelper_1.getCoordinatesFromUrl)(url);
    if (!coordinates) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Could not extract coordinates. Try using the full URL from your browser address bar.');
    }
    return coordinates;
};
exports.PlaceService = {
    createPlace,
    getAllPlaces,
    getPlaceById,
    incrementOpenCount,
    updatePlace,
    deletePlace,
    extractCoordinates,
};
