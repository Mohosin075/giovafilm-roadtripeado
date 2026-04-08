"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwardRoutes = void 0;
const express_1 = __importDefault(require("express"));
const award_controller_1 = require("./award.controller");
const auth_1 = __importDefault(require("../../middleware/auth"));
const user_1 = require("../../enum/user");
const router = express_1.default.Router();
router.get('/my-awards', (0, auth_1.default)(user_1.USER_ROLES.USER, user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), award_controller_1.AwardController.getMyAwards);
exports.AwardRoutes = router;
