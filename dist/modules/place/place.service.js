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
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toNumber = (value) => {
    const parsed = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
    return Number.isFinite(parsed) ? parsed : NaN;
};
const createPlace = async (payload) => {
    var _a;
    // Auto-populate country if not provided (run before transaction/session to prevent locks)
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
    // 1. Fetch regular places if applicable
    const queryType = query.type;
    const shouldQueryPlaces = !queryType || queryType === 'Regular' || queryType.includes('Regular');
    let places = [];
    if (shouldQueryPlaces) {
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
            .populate('map', 'name country status isPaid')
            .lean();
        if (!hasGeo) {
            placeQuery = placeQuery.sort(sort);
        }
        places = await placeQuery;
    }
    const formattedPlaces = places.map(p => ({
        ...p,
        _id: p._id.toString(),
    }));
    // 2. Fetch businesses if applicable
    const shouldQueryBusinesses = !queryType || queryType === 'Business' || queryType.includes('Business');
    let formattedBusinesses = [];
    if (shouldQueryBusinesses) {
        const businessMatch = {};
        if (match.category) {
            businessMatch.category = match.category;
        }
        if (match.country) {
            businessMatch['location.country'] = match.country;
        }
        else if (match.map) {
            if (typeof match.map === 'object' && match.map !== null && '$in' in match.map) {
                const mapObjs = await map_model_1.Map.find({ _id: match.map }).select('name').lean();
                businessMatch['location.country'] = { $in: mapObjs.map(m => m.name) };
            }
            else {
                const mapObj = await map_model_1.Map.findById(match.map).select('name').lean();
                if (mapObj) {
                    businessMatch['location.country'] = mapObj.name;
                }
            }
        }
        if (match.status) {
            if (typeof match.status === 'object' && match.status !== null && '$in' in match.status) {
                const statusObj = match.status;
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
            else if (sortField === 'createdAt' || sortField === 'updatedAt') {
                valA = valA ? new Date(valA).getTime() : 0;
                valB = valB ? new Date(valB).getTime() : 0;
            }
            if (typeof valA === 'string')
                valA = valA.toLowerCase();
            if (typeof valB === 'string')
                valB = valB.toLowerCase();
            if (valA < valB)
                return isDesc ? 1 : -1;
            if (valA > valB)
                return isDesc ? -1 : 1;
            return 0;
        });
    }
    const total = combined.length;
    const paginatedData = combined.slice(skip, skip + limit);
    return {
        meta: {
            total,
            page,
            limit,
            totalPage: Math.ceil(total / limit) || 0,
        },
        data: paginatedData,
    };
};
const getPlaceById = async (id) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const result = await place_model_1.Place.findById(id).populate('category').populate('map');
    if (result)
        return result;
    // Fallback to checking Business collection
    const business = await business_model_1.Business.findById(id).populate('category');
    if (business) {
        // Map Business fields to Place schema so frontend doesn't break
        return {
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
    throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Place not found');
};
const incrementOpenCount = async (id) => {
    const result = await place_model_1.Place.findByIdAndUpdate(id, { $inc: { openCount: 1 } }, { new: true }).select('name openCount');
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Place not found');
    }
    return result;
};
const updatePlace = async (id, payload) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const isExist = await place_model_1.Place.findById(id);
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
        if (payload.address || ((_a = payload.location) === null || _a === void 0 ? void 0 : _a.coordinates)) {
            businessPayload.location = {
                ...(isBusiness.location || {}),
                ...(payload.address && { address: payload.address }),
                ...(((_b = payload.location) === null || _b === void 0 ? void 0 : _b.coordinates) && {
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
                media: ((_c = updatedBusiness.media) === null || _c === void 0 ? void 0 : _c.photos) || [],
                menuImages: ((_d = updatedBusiness.media) === null || _d === void 0 ? void 0 : _d.menu) ? [updatedBusiness.media.menu] : [],
                address: ((_e = updatedBusiness.location) === null || _e === void 0 ? void 0 : _e.address) || '',
                country: ((_f = updatedBusiness.location) === null || _f === void 0 ? void 0 : _f.country) || '',
                location: {
                    type: 'Point',
                    coordinates: ((_h = (_g = updatedBusiness.location) === null || _g === void 0 ? void 0 : _g.mapLocation) === null || _h === void 0 ? void 0 : _h.coordinates) || [],
                },
                map: { name: (_j = updatedBusiness.location) === null || _j === void 0 ? void 0 : _j.country },
            };
        }
        return null;
    }
    const nextCoords = (_k = payload.location) === null || _k === void 0 ? void 0 : _k.coordinates;
    const prevCoords = (_l = isExist.location) === null || _l === void 0 ? void 0 : _l.coordinates;
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
exports.PlaceService = {
    createPlace,
    getAllPlaces,
    getPlaceById,
    incrementOpenCount,
    updatePlace,
    deletePlace,
};
