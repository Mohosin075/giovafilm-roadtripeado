"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_route_1 = require("../modules/user/user.route");
const auth_route_1 = require("../modules/auth/auth.route");
const express_1 = __importDefault(require("express"));
const public_route_1 = require("../modules/public/public.route");
const support_route_1 = require("../modules/support/support.route");
const upload_route_1 = require("../modules/upload/upload.route");
const notification_routes_1 = require("../modules/notification/notification.routes");
const message_routes_1 = require("../modules/message/message.routes");
const chat_routes_1 = require("../modules/chat/chat.routes");
const review_route_1 = require("../modules/review/review.route");
const subscription_route_1 = require("../modules/subscription/subscription.route");
const category_route_1 = require("../modules/category/category.route");
const place_route_1 = require("../modules/place/place.route");
const offer_route_1 = require("../modules/offer/offer.route");
const business_route_1 = require("../modules/business/business.route");
const http_status_codes_1 = require("http-status-codes");
const router = express_1.default.Router();
const apiRoutes = [
    { path: '/user', route: user_route_1.UserRoutes },
    { path: '/auth', route: auth_route_1.AuthRoutes },
    { path: '/notifications', route: notification_routes_1.NotificationRoutes },
    { path: '/public', route: public_route_1.PublicRoutes },
    { path: '/support', route: support_route_1.SupportRoutes },
    { path: '/upload', route: upload_route_1.UploadRoutes },
    { path: '/message', route: message_routes_1.MessageRoutes },
    { path: '/chat', route: chat_routes_1.ChatRoutes },
    { path: '/review', route: review_route_1.ReviewRoutes },
    { path: '/subscription', route: subscription_route_1.SubscriptionRoutes },
    { path: '/category', route: category_route_1.CategoryRoutes },
    { path: '/place', route: place_route_1.PlaceRoutes },
    { path: '/offer', route: offer_route_1.OfferRoutes },
    { path: '/business', route: business_route_1.BusinessRoutes },
];
apiRoutes.forEach(route => {
    router.use(route.path, route.route);
});
router.get('/status', (req, res) => {
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: 'Server is running smoothly',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV,
    });
});
exports.default = router;
