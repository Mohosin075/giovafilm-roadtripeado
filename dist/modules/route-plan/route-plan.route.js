"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutePlanRoutes = void 0;
const express_1 = __importDefault(require("express"));
const route_plan_controller_1 = require("./route-plan.controller");
const validateRequest_1 = __importDefault(require("../../middleware/validateRequest"));
const route_plan_validation_1 = require("./route-plan.validation");
const auth_1 = __importDefault(require("../../middleware/auth"));
const user_1 = require("../../enum/user");
const router = express_1.default.Router();
// All route-plan actions require authenticated user
const authMiddleware = (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN, user_1.USER_ROLES.MAP_EDITOR);
router
    .route('/')
    .post(authMiddleware, (0, validateRequest_1.default)(route_plan_validation_1.createRoutePlanZodSchema), route_plan_controller_1.RoutePlanController.createRoutePlan)
    .get(authMiddleware, route_plan_controller_1.RoutePlanController.getMyRoutePlans);
router.route('/my-routes').get(authMiddleware, route_plan_controller_1.RoutePlanController.getMyRoutePlans);
router
    .route('/:id')
    .get(authMiddleware, route_plan_controller_1.RoutePlanController.getRoutePlanById)
    .patch(authMiddleware, (0, validateRequest_1.default)(route_plan_validation_1.updateRoutePlanZodSchema), route_plan_controller_1.RoutePlanController.updateRoutePlan)
    .delete(authMiddleware, route_plan_controller_1.RoutePlanController.deleteRoutePlan);
// Clear all stops in a route
router.route('/:id/clear').post(authMiddleware, route_plan_controller_1.RoutePlanController.clearRouteStops);
// Add a single stop or remove a specific stop
router
    .route('/:id/stops')
    .post(authMiddleware, (0, validateRequest_1.default)(route_plan_validation_1.addStopZodSchema), route_plan_controller_1.RoutePlanController.addStop);
router
    .route('/:id/stops/:stopId')
    .delete(authMiddleware, route_plan_controller_1.RoutePlanController.removeStop);
exports.RoutePlanRoutes = router;
