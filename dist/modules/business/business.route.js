"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessRoutes = void 0;
const express_1 = __importDefault(require("express"));
const business_controller_1 = require("./business.controller");
const validateRequest_1 = __importDefault(require("../../middleware/validateRequest"));
const business_validation_1 = require("./business.validation");
const auth_1 = __importDefault(require("../../middleware/auth"));
const user_1 = require("../../enum/user");
const router = express_1.default.Router();
// User submitting a business (pending by default)
router
    .route('/')
    .post((0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(business_validation_1.createBusinessZodSchema), business_controller_1.BusinessController.createBusiness)
    .get(business_controller_1.BusinessController.getAllBusinesses);
router
    .route('/:id')
    .get(business_controller_1.BusinessController.getBusinessById)
    // Only admin/super_admin or the owner should update, but for simplicity auth is USER
    .patch((0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(business_validation_1.updateBusinessZodSchema), business_controller_1.BusinessController.updateBusiness)
    .delete((0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), // Only admins can delete a business
business_controller_1.BusinessController.deleteBusiness);
// Admin route to approve/reject
router.patch('/:id/status', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(business_validation_1.updateBusinessStatusZodSchema), business_controller_1.BusinessController.updateBusinessStatus);
exports.BusinessRoutes = router;
