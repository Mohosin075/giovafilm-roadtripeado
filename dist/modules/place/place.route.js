"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlaceRoutes = void 0;
const express_1 = __importDefault(require("express"));
const place_controller_1 = require("./place.controller");
const validateRequest_1 = __importDefault(require("../../middleware/validateRequest"));
const place_validation_1 = require("./place.validation");
const auth_1 = __importDefault(require("../../middleware/auth"));
const user_1 = require("../../enum/user");
const router = express_1.default.Router();
router
    .route('/')
    .post((0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(place_validation_1.createPlaceZodSchema), place_controller_1.PlaceController.createPlace)
    .get(place_controller_1.PlaceController.getAllPlaces);
router
    .route('/:id')
    .get(place_controller_1.PlaceController.getPlaceById)
    .patch((0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), (0, validateRequest_1.default)(place_validation_1.updatePlaceZodSchema), place_controller_1.PlaceController.updatePlace)
    .delete((0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), place_controller_1.PlaceController.deletePlace);
exports.PlaceRoutes = router;
