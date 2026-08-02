"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserServices = exports.getProfile = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const user_model_1 = require("./user.model");
const mongoose_1 = require("mongoose");
const user_1 = require("../../enum/user");
const paginationHelper_1 = require("../../helpers/paginationHelper");
const config_1 = __importDefault(require("../../config"));
const user_constants_1 = require("./user.constants");
const crypto_1 = require("../../utils/crypto");
const emailTemplate_1 = require("../../shared/emailTemplate");
const emailHelper_1 = require("../../helpers/emailHelper");
const updateProfile = async (user, payload) => {
    console.log({ payload });
    const isUserExist = await user_model_1.User.findOne({
        _id: user.authId,
        status: { $nin: [user_1.USER_STATUS.DELETED] },
    });
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    const updatedProfile = await user_model_1.User.findOneAndUpdate({ _id: user.authId, status: { $nin: [user_1.USER_STATUS.DELETED] } }, {
        $set: payload,
    }, { new: true });
    if (!updatedProfile) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to update profile.');
    }
    return 'Profile updated successfully.';
};
const createAdmin = async () => {
    const admin = {
        email: config_1.default.super_admin.email,
        name: config_1.default.super_admin.name,
        password: config_1.default.super_admin.password,
        role: user_1.USER_ROLES.SUPER_ADMIN,
        status: user_1.USER_STATUS.ACTIVE,
        verified: true,
        authentication: {
            oneTimeCode: null,
            restrictionLeftAt: null,
            expiresAt: null,
            latestRequestAt: new Date(),
            authType: 'createAccount',
        },
    };
    const isAdminExist = await user_model_1.User.findOne({
        email: admin.email,
        status: { $nin: [user_1.USER_STATUS.DELETED] },
    });
    if (isAdminExist) {
        console.log('Admin account already exist, skipping creation.🦥');
        return isAdminExist;
    }
    const result = await user_model_1.User.create([admin]);
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to create admin');
    }
    return result[0];
};
const getAllUsers = async (paginationOptions, filterables = {}) => {
    const { searchTerm, ...filterData } = filterables;
    const { page, skip, limit, sortBy, sortOrder } = paginationHelper_1.paginationHelper.calculatePagination(paginationOptions);
    let whereConditions = {};
    // 🔥 FIXED: Properly typed arrays
    const searchConditions = [];
    const filterConditions = [];
    // Search functionality
    if (searchTerm && searchTerm.trim() !== '') {
        searchConditions.push({
            $or: user_constants_1.userFilterableFields.map(field => ({
                [field]: {
                    $regex: searchTerm.trim(),
                    $options: 'i',
                },
            })),
        });
    }
    // Filter functionality
    if (Object.keys(filterData).length > 0) {
        Object.entries(filterData).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
                if (key !== 'status') {
                    filterConditions.push({ [key]: value });
                }
            }
        });
    }
    // Handle status filtering (allows retrieving deleted users if explicitly requested)
    if (filterData.status) {
        filterConditions.push({ status: filterData.status });
    }
    else {
        // Default: Exclude deleted and null status users if no status is specified
        filterConditions.push({
            status: { $nin: [user_1.USER_STATUS.DELETED, null] },
        });
    }
    // Combine conditions
    if (searchConditions.length > 0 && filterConditions.length > 0) {
        whereConditions = {
            $and: [...searchConditions, ...filterConditions],
        };
    }
    else if (searchConditions.length > 0) {
        whereConditions = { $and: searchConditions };
    }
    else if (filterConditions.length > 0) {
        whereConditions = { $and: filterConditions };
    }
    const [users, total] = await Promise.all([
        user_model_1.User.find(whereConditions)
            .skip(skip)
            .limit(limit)
            .sort(sortBy ? { [sortBy]: sortOrder } : { createdAt: -1 })
            .select('-password -authentication -__v')
            .lean(),
        user_model_1.User.countDocuments(whereConditions),
    ]);
    const result = users.map(user => {
        return {
            ...user,
        };
    });
    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        data: result,
    };
};
const deleteUser = async (userId, actor) => {
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid User ID.');
    }
    const isUserExist = await user_model_1.User.findOne({
        _id: userId,
        status: { $nin: [user_1.USER_STATUS.DELETED] },
    });
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    assertCanDeleteUser(actor === null || actor === void 0 ? void 0 : actor.role, isUserExist.role);
    const deletedUser = await user_model_1.User.findOneAndUpdate({ _id: userId, status: { $nin: [user_1.USER_STATUS.DELETED] } }, { $set: { status: user_1.USER_STATUS.DELETED } }, { new: true });
    if (!deletedUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to delete user.');
    }
    return 'User deleted successfully.';
};
const deleteProfile = async (userId, password) => {
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid User ID.');
    }
    const isUserExist = await user_model_1.User.findOne({
        _id: userId,
        status: { $nin: [user_1.USER_STATUS.DELETED] },
    }).select('+password');
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    const isPasswordMatched = await user_model_1.User.isPasswordMatched(password, isUserExist.password);
    if (!isPasswordMatched) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Password is incorrect.');
    }
    const deletedUser = await user_model_1.User.findOneAndUpdate({ _id: userId, status: { $nin: [user_1.USER_STATUS.DELETED] } }, { $set: { status: user_1.USER_STATUS.DELETED } }, { new: true });
    if (!deletedUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to delete profile.');
    }
    return 'Profile deleted successfully.';
};
const getUserById = async (userId) => {
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid User ID.');
    }
    const user = await user_model_1.User.findOne({
        _id: userId,
        status: { $nin: [user_1.USER_STATUS.DELETED] },
    }).select('-password -authentication -__v');
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    return user;
};
/** Public, shareable profile — safe fields only */
const getPublicProfile = async (userId) => {
    var _a;
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid User ID.');
    }
    const user = await user_model_1.User.findOne({
        _id: userId,
        status: user_1.USER_STATUS.ACTIVE,
        verified: true,
    }).select('name profile level points role createdAt website instagram description specialty settings.profileStatus');
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Profile not found.');
    }
    if (((_a = user.settings) === null || _a === void 0 ? void 0 : _a.profileStatus) === 'private') {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'This profile is private.');
    }
    return user;
};
const updateUserStatus = async (userId, status, actor) => {
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid User ID.');
    }
    const isUserExist = await user_model_1.User.findOne({
        _id: userId,
        status: { $nin: [user_1.USER_STATUS.DELETED] },
    });
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    // Admin cannot change super_admin status
    if (isUserExist.role === user_1.USER_ROLES.SUPER_ADMIN &&
        (actor === null || actor === void 0 ? void 0 : actor.role) !== user_1.USER_ROLES.SUPER_ADMIN) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only Super Admin can update Super Admin status.');
    }
    const updatedUser = await user_model_1.User.findOneAndUpdate({ _id: userId, status: { $nin: [user_1.USER_STATUS.DELETED] } }, { $set: { status } }, { new: true });
    if (!updatedUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to update user status.');
    }
    return 'User status updated successfully.';
};
const assertCanAssignRole = (actorRole, targetRole, existingRole) => {
    if (!actorRole) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'You are not authorized.');
    }
    // Only super_admin can create / manage super_admin
    if ((targetRole === user_1.USER_ROLES.SUPER_ADMIN ||
        existingRole === user_1.USER_ROLES.SUPER_ADMIN) &&
        actorRole !== user_1.USER_ROLES.SUPER_ADMIN) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Only Super Admin can manage Super Admin accounts.');
    }
    if (actorRole !== user_1.USER_ROLES.ADMIN &&
        actorRole !== user_1.USER_ROLES.SUPER_ADMIN) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized.');
    }
};
const assertCanDeleteUser = (actorRole, targetRole) => {
    if (!actorRole) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'You are not authorized.');
    }
    if (!targetRole) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Target user role is missing.');
    }
    if (targetRole === user_1.USER_ROLES.SUPER_ADMIN) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Super Admin accounts cannot be deleted this way.');
    }
    if (actorRole === user_1.USER_ROLES.SUPER_ADMIN) {
        return;
    }
    if (actorRole === user_1.USER_ROLES.ADMIN) {
        // Admin can delete regular users and map editors only
        if (targetRole === user_1.USER_ROLES.USER ||
            targetRole === user_1.USER_ROLES.MAP_EDITOR) {
            return;
        }
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Admins cannot delete other admin accounts.');
    }
    throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'You are not authorized.');
};
const updateUserRole = async (userId, role, assignedMaps, assignedCountries, actor) => {
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid User ID.');
    }
    const isUserExist = await user_model_1.User.findOne({
        _id: userId,
        status: { $nin: [user_1.USER_STATUS.DELETED] },
    });
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    assertCanAssignRole(actor === null || actor === void 0 ? void 0 : actor.role, role, isUserExist.role);
    const updateData = { role };
    if (role === user_1.USER_ROLES.MAP_EDITOR) {
        const maps = assignedMaps || [];
        const countries = assignedCountries || [];
        if (maps.length === 0 && countries.length === 0) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Map Editor must be assigned at least one map or country.');
        }
        updateData.assignedMaps = maps;
        updateData.assignedCountries = countries;
    }
    else {
        // Clear editor scope when leaving map_editor
        updateData.assignedMaps = [];
        updateData.assignedCountries = [];
    }
    const updatedUser = await user_model_1.User.findOneAndUpdate({ _id: userId, status: { $nin: [user_1.USER_STATUS.DELETED] } }, { $set: updateData }, { new: true });
    if (!updatedUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to update user role.');
    }
    return 'User role updated successfully.';
};
const inviteUser = async (payload, actor) => {
    const email = payload.email.toLowerCase().trim();
    assertCanAssignRole(actor === null || actor === void 0 ? void 0 : actor.role, payload.role);
    const isUserExist = await user_model_1.User.findOne({ email });
    if (isUserExist && isUserExist.verified) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'User with this email already exists and is verified.');
    }
    const otp = (0, crypto_1.generateOtp)();
    const otpExpiresIn = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours for invitation
    const authentication = {
        oneTimeCode: otp,
        expiresAt: otpExpiresIn,
        latestRequestAt: new Date(),
        requestCount: 1,
        authType: 'createAccount',
    };
    const baseUpdate = {
        role: payload.role,
        status: user_1.USER_STATUS.ACTIVE,
        verified: false,
        authentication,
    };
    if (payload.role === user_1.USER_ROLES.MAP_EDITOR) {
        const maps = payload.assignedMaps || [];
        const countries = payload.assignedCountries || [];
        if (maps.length === 0 && countries.length === 0) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Map Editor must be assigned at least one map or country.');
        }
        baseUpdate.assignedMaps = maps;
        baseUpdate.assignedCountries = countries;
    }
    else {
        // Re-invite as non-editor — clear any previous editor scope
        baseUpdate.assignedMaps = [];
        baseUpdate.assignedCountries = [];
    }
    let user;
    if (isUserExist) {
        // Update existing unverified or deleted user
        user = await user_model_1.User.findOneAndUpdate({ email }, { $set: baseUpdate }, { new: true });
    }
    else {
        // Create new user
        user = await user_model_1.User.create({
            email,
            ...baseUpdate
        });
    }
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to invite user.');
    }
    // Send invitation email
    const invitationEmail = emailTemplate_1.emailTemplate.userInvitation({
        email: user.email,
        role: user.role,
        otp,
    });
    await emailHelper_1.emailHelper.sendEmail(invitationEmail);
    return 'User invited successfully.';
};
const getProfile = async (user) => {
    // --- Fetch user ---
    const isUserExist = await user_model_1.User.findOne({
        _id: user.authId,
        status: { $nin: [user_1.USER_STATUS.DELETED] },
    })
        .select('-authentication -password -__v')
        .populate('assignedMaps', 'name country');
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    return isUserExist;
};
exports.getProfile = getProfile;
const addUserInterest = async (userId, interest) => {
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid User ID.');
    }
    const isUserExist = await user_model_1.User.findOne({
        _id: userId,
        status: { $nin: [user_1.USER_STATUS.DELETED] },
    });
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    const updatedUser = await user_model_1.User.findOneAndUpdate({ _id: userId, status: { $nin: [user_1.USER_STATUS.DELETED] } }, { $set: { interest } }, { new: true });
    if (!updatedUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to update user interest.');
    }
    return updatedUser;
};
const toggleFavoriteMap = async (userId, mapId) => {
    var _a;
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid User ID.');
    }
    if (!mongoose_1.Types.ObjectId.isValid(mapId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid Map ID.');
    }
    const isUserExist = await user_model_1.User.findById(userId);
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    const isFavorite = (_a = isUserExist.favoriteMaps) === null || _a === void 0 ? void 0 : _a.includes(new mongoose_1.Types.ObjectId(mapId));
    const updateDoc = isFavorite
        ? {
            $pull: { favoriteMaps: mapId },
        }
        : {
            $addToSet: { favoriteMaps: mapId },
        };
    const result = await user_model_1.User.findByIdAndUpdate(userId, updateDoc, { new: true });
    return result;
};
const getFavoriteMaps = async (userId) => {
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid User ID.');
    }
    const user = await user_model_1.User.findById(userId)
        .populate({
        path: 'favoriteMaps',
        select: 'name country images isActive isPaid price rating totalReview createdAt description',
    })
        .lean();
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    return user.favoriteMaps || [];
};
const toggleFavoriteOffer = async (userId, offerId) => {
    var _a;
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid User ID.');
    }
    if (!mongoose_1.Types.ObjectId.isValid(offerId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid Offer ID.');
    }
    const isUserExist = await user_model_1.User.findById(userId);
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    const isFavorite = (_a = isUserExist.favoriteOffers) === null || _a === void 0 ? void 0 : _a.includes(new mongoose_1.Types.ObjectId(offerId));
    if (isFavorite) {
        await user_model_1.User.findByIdAndUpdate(userId, {
            $pull: { favoriteOffers: offerId },
        });
        return 'Offer removed from favorites.';
    }
    else {
        await user_model_1.User.findByIdAndUpdate(userId, {
            $addToSet: { favoriteOffers: offerId },
        });
        return 'Offer added to favorites.';
    }
};
const getFavoriteOffers = async (userId) => {
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid User ID.');
    }
    const user = await user_model_1.User.findById(userId).populate({
        path: 'favoriteOffers',
        populate: { path: 'place' },
    });
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    return user.favoriteOffers || [];
};
const updatePointsAndLevel = async (userId, pointsToAdd) => {
    const user = await user_model_1.User.findById(userId);
    if (!user)
        return;
    const newPoints = (user.points || 0) + pointsToAdd;
    // Simple level logic: every 1000 points = 1 level
    const newLevel = Math.floor(newPoints / 1000) + 1;
    await user_model_1.User.findByIdAndUpdate(userId, {
        $set: {
            points: newPoints,
            level: newLevel,
        },
    });
};
const assignEditorAccess = async (userId, assignedMaps, assignedCountries) => {
    var _a, _b, _c;
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid User ID.');
    }
    const user = await user_model_1.User.findById(userId);
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    if (user.role !== user_1.USER_ROLES.MAP_EDITOR) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'User is not a MAP_EDITOR.');
    }
    const maps = (_b = assignedMaps !== null && assignedMaps !== void 0 ? assignedMaps : (_a = user.assignedMaps) === null || _a === void 0 ? void 0 : _a.map((id) => id.toString())) !== null && _b !== void 0 ? _b : [];
    const countries = (_c = assignedCountries !== null && assignedCountries !== void 0 ? assignedCountries : user.assignedCountries) !== null && _c !== void 0 ? _c : [];
    if (maps.length === 0 && countries.length === 0) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Map Editor must be assigned at least one map or country.');
    }
    const updateData = {};
    if (assignedMaps !== undefined) {
        updateData.assignedMaps = assignedMaps;
    }
    if (assignedCountries !== undefined) {
        updateData.assignedCountries = assignedCountries;
    }
    const updatedUser = await user_model_1.User.findByIdAndUpdate(userId, { $set: updateData }, { new: true, runValidators: true });
    return updatedUser;
};
exports.UserServices = {
    updateProfile,
    createAdmin,
    getAllUsers,
    deleteUser,
    getUserById,
    getPublicProfile,
    updateUserStatus,
    updateUserRole,
    inviteUser,
    getProfile: exports.getProfile,
    deleteProfile,
    addUserInterest,
    toggleFavoriteMap,
    getFavoriteMaps,
    toggleFavoriteOffer,
    getFavoriteOffers,
    updatePointsAndLevel,
    assignEditorAccess,
};
