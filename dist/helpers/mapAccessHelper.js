"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEditorEditAccess = exports.getAccessibleMapIds = exports.getUserFromToken = void 0;
const config_1 = __importDefault(require("../config"));
const jwtHelper_1 = require("./jwtHelper");
const user_model_1 = require("../modules/user/user.model");
const map_model_1 = require("../modules/map/map.model");
const user_1 = require("../enum/user");
const getUserFromToken = async (authorizationHeader) => {
    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authorizationHeader.split(' ')[1];
    if (!token)
        return null;
    try {
        const verified = jwtHelper_1.jwtHelper.verifyToken(token, config_1.default.jwt.jwt_secret);
        if (!verified || !verified.authId)
            return null;
        const user = await user_model_1.User.findById(verified.authId);
        return user;
    }
    catch (err) {
        return null;
    }
};
exports.getUserFromToken = getUserFromToken;
const getAccessibleMapIds = async (user) => {
    // If user is Admin, Super Admin, or Map Editor, they have access to all maps
    if (user && [user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.MAP_EDITOR].includes(user.role)) {
        const allMaps = await map_model_1.Map.find({}, '_id');
        return allMaps.map(m => m._id.toString());
    }
    // Find all free maps
    const freeMaps = await map_model_1.Map.find({ isPaid: false }, '_id');
    const freeMapIds = freeMaps.map(m => m._id.toString());
    // If user is logged in, append purchased maps
    if (user && user.purchasedMaps) {
        const purchasedMapIds = user.purchasedMaps.map((id) => id.toString());
        return Array.from(new Set([...freeMapIds, ...purchasedMapIds]));
    }
    return freeMapIds;
};
exports.getAccessibleMapIds = getAccessibleMapIds;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../errors/ApiError"));
const verifyEditorEditAccess = async (user, mapId) => {
    var _a, _b;
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'You are not authorized.');
    }
    // Admin and Super Admin have full access
    if ([user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN].includes(user.role)) {
        return true;
    }
    // If Map Editor, check assigned maps and countries
    if (user.role === user_1.USER_ROLES.MAP_EDITOR) {
        const map = await map_model_1.Map.findById(mapId);
        if (!map) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Map not found.');
        }
        const mapIdStr = map._id.toString();
        const mapCountry = map.country;
        const isAssignedMap = (_a = user.assignedMaps) === null || _a === void 0 ? void 0 : _a.some((id) => id.toString() === mapIdStr);
        const isAssignedCountry = mapCountry && ((_b = user.assignedCountries) === null || _b === void 0 ? void 0 : _b.includes(mapCountry));
        if (isAssignedMap || isAssignedCountry) {
            return true;
        }
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized to edit this map or its places.');
    }
    throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You do not have permission to edit this resource.');
};
exports.verifyEditorEditAccess = verifyEditorEditAccess;
