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
        isDeleted: { $ne: true },
    });
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    const updatedProfile = await user_model_1.User.findOneAndUpdate({
        _id: user.authId,
        status: { $nin: [user_1.USER_STATUS.DELETED] },
        isDeleted: { $ne: true },
    }, {
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
        isDeleted: { $ne: true },
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
    // Exclude soft-deleted users
    filterConditions.push({ isDeleted: { $ne: true } });
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
    console.log(result, 'resule');
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
const deleteUser = async (userId) => {
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid User ID.');
    }
    const isUserExist = await user_model_1.User.findOne({
        _id: userId,
        isDeleted: { $ne: true },
    });
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    const deletedEmail = `${isUserExist.email}_deleted_${Date.now()}`;
    const deletedUser = await user_model_1.User.findOneAndUpdate({ _id: userId, isDeleted: { $ne: true } }, {
        $set: {
            isDeleted: true,
            deletedAt: new Date(),
            status: user_1.USER_STATUS.DELETED,
            email: deletedEmail,
        },
    }, { new: true });
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
        isDeleted: { $ne: true },
    }).select('+password');
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    const isPasswordMatched = await user_model_1.User.isPasswordMatched(password, isUserExist.password);
    if (!isPasswordMatched) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Password is incorrect.');
    }
    const deletedEmail = `${isUserExist.email}_deleted_${Date.now()}`;
    const deletedUser = await user_model_1.User.findOneAndUpdate({ _id: userId, isDeleted: { $ne: true } }, {
        $set: {
            isDeleted: true,
            deletedAt: new Date(),
            status: user_1.USER_STATUS.DELETED,
            email: deletedEmail,
        },
    }, { new: true });
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
        isDeleted: { $ne: true },
    }).select('-password -authentication -__v');
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    return user;
};
const updateUserStatus = async (userId, status) => {
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid User ID.');
    }
    const isUserExist = await user_model_1.User.findOne({
        _id: userId,
        isDeleted: { $ne: true },
    });
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    const updatedUser = await user_model_1.User.findOneAndUpdate({ _id: userId, isDeleted: { $ne: true } }, { $set: { status } }, { new: true });
    if (!updatedUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to update user status.');
    }
    return 'User status updated successfully.';
};
const updateUserRole = async (userId, role) => {
    if (!mongoose_1.Types.ObjectId.isValid(userId)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid User ID.');
    }
    const isUserExist = await user_model_1.User.findOne({
        _id: userId,
        isDeleted: { $ne: true },
    });
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    const updatedUser = await user_model_1.User.findOneAndUpdate({ _id: userId, isDeleted: { $ne: true } }, { $set: { role } }, { new: true });
    if (!updatedUser) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to update user role.');
    }
    return 'User role updated successfully.';
};
const inviteUser = async (payload) => {
    const email = payload.email.toLowerCase().trim();
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
    let user;
    if (isUserExist) {
        // Update existing unverified or deleted user
        user = await user_model_1.User.findOneAndUpdate({ email }, {
            $set: {
                role: payload.role,
                status: user_1.USER_STATUS.ACTIVE,
                verified: false,
                authentication,
            },
        }, { new: true });
    }
    else {
        // Create new user
        user = await user_model_1.User.create({
            email,
            role: payload.role,
            status: user_1.USER_STATUS.ACTIVE,
            verified: false,
            authentication,
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
        isDeleted: { $ne: true },
    }).select('-authentication -password -__v');
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
        isDeleted: { $ne: true },
    });
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found.');
    }
    const updatedUser = await user_model_1.User.findOneAndUpdate({ _id: userId, isDeleted: { $ne: true } }, { $set: { interest } }, { new: true });
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
    const user = await user_model_1.User.findById(userId).populate({
        path: 'favoriteMaps',
        populate: { path: 'places', populate: { path: 'category' } },
    });
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
exports.UserServices = {
    updateProfile,
    createAdmin,
    getAllUsers,
    deleteUser,
    getUserById,
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
};
