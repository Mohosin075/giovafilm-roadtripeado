"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryRoutes = void 0;
const express_1 = __importDefault(require("express"));
const category_controller_1 = require("./category.controller");
const validateRequest_1 = __importDefault(require("../../middleware/validateRequest"));
const category_validation_1 = require("./category.validation");
const auth_1 = __importDefault(require("../../middleware/auth"));
const user_1 = require("../../enum/user");
const processReqBody_1 = require("../../middleware/processReqBody");
const router = express_1.default.Router();
router
    .route('/')
    .post((0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, processReqBody_1.fileAndBodyProcessorUsingDiskStorage)(), (0, validateRequest_1.default)(category_validation_1.createCategoryZodSchema), category_controller_1.CategoryController.createCategory)
    .get(category_controller_1.CategoryController.getAllCategories);
router
    .route('/:id')
    .get(category_controller_1.CategoryController.getCategoryById)
    .patch((0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, processReqBody_1.fileAndBodyProcessorUsingDiskStorage)(), (0, validateRequest_1.default)(category_validation_1.updateCategoryZodSchema), category_controller_1.CategoryController.updateCategory)
    .delete((0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), category_controller_1.CategoryController.deleteCategory);
exports.CategoryRoutes = router;
