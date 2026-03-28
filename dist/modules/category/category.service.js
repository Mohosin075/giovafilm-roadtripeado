"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryService = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const category_model_1 = require("./category.model");
const QueryBuilder_1 = __importDefault(require("../../builder/QueryBuilder"));
const category_constants_1 = require("./category.constants");
const createCategory = async (payload) => {
    const isExist = await category_model_1.Category.findOne({ name: payload.name });
    if (isExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.CONFLICT, 'Category already exists');
    }
    const result = await category_model_1.Category.create(payload);
    return result;
};
const getAllCategories = async (query) => {
    const categoryQuery = new QueryBuilder_1.default(category_model_1.Category.find(), query)
        .search(category_constants_1.categorySearchableFields)
        .filter()
        .sort()
        .paginate()
        .fields();
    const result = await categoryQuery.modelQuery;
    const meta = await categoryQuery.getPaginationInfo();
    return {
        meta,
        data: result,
    };
};
const getCategoryById = async (id) => {
    const result = await category_model_1.Category.findById(id);
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Category not found');
    }
    return result;
};
const updateCategory = async (id, payload) => {
    const isExist = await category_model_1.Category.findById(id);
    if (!isExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Category not found');
    }
    const result = await category_model_1.Category.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    });
    return result;
};
const deleteCategory = async (id) => {
    const isExist = await category_model_1.Category.findById(id);
    if (!isExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Category not found');
    }
    const result = await category_model_1.Category.findByIdAndDelete(id);
    return result;
};
exports.CategoryService = {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
};
