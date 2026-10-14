"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisitedRoutes = void 0;
const express_1 = __importDefault(require("express"));
const visited_controller_1 = require("./visited.controller");
const validateRequest_1 = __importDefault(require("../../middleware/validateRequest"));
const visited_validation_1 = require("./visited.validation");
const auth_1 = __importDefault(require("../../middleware/auth"));
const user_1 = require("../../enum/user");
const router = express_1.default.Router();
router
    .route('/')
    .post((0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(visited_validation_1.toggleVisitedZodSchema), visited_controller_1.VisitedController.toggleVisited);
router.post('/toggle', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(visited_validation_1.toggleVisitedZodSchema), visited_controller_1.VisitedController.toggleVisited);
router.get('/my-places', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), visited_controller_1.VisitedController.getMyVisitedPlaces);
router.get('/count', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), visited_controller_1.VisitedController.getVisitedCount);
router.delete('/:id', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), visited_controller_1.VisitedController.removeVisited);
exports.VisitedRoutes = router;
