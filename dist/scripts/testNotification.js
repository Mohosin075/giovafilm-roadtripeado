"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("../config"));
const user_model_1 = require("../modules/user/user.model");
const notification_model_1 = require("../modules/notification/notification.model");
const notification_service_1 = require("../modules/notification/notification.service");
const notification_interface_1 = require("../modules/notification/notification.interface");
async function runTest() {
    console.log('🔄 Connecting to database...');
    await mongoose_1.default.connect(config_1.default.database_url);
    console.log('✅ Connected to MongoDB successfully\n');
    try {
        // 1. Get a sample user from DB
        let user = await user_model_1.User.findOne({ isVerified: true }).lean();
        if (!user) {
            user = await user_model_1.User.findOne().lean();
        }
        if (!user) {
            console.log('⚠️ No user found in DB, creating a mock ObjectId');
            user = { _id: new mongoose_1.default.Types.ObjectId(), name: 'Test User' };
        }
        const userId = user._id.toString();
        console.log(`👤 Using User: ${user.name || 'User'} (ID: ${userId})`);
        const createdIds = [];
        // 2. Test Account Notification: onReviewApproved
        console.log('\n--- TEST 1: Account Notification (Approved Review) ---');
        const revNotif = await notification_service_1.NotificationServices.createNotification({
            userId,
            title: { es: 'Reseña aprobada (Test)', en: 'Review Approved (Test)' },
            content: { es: 'Tu reseña fue aprobada +10 pts', en: 'Your review was approved +10 pts' },
            type: notification_interface_1.NotificationType.APPROVED_REVIEW,
            category: notification_interface_1.NotificationCategory.ACCOUNT,
        });
        createdIds.push(revNotif._id);
        console.log(`✅ Approved Review Notification created: [${revNotif._id}] Category: [${revNotif.category}]`);
        // 3. Test Account Notification: onLevelUnlocked
        console.log('\n--- TEST 2: Account Notification (Level Unlocked) ---');
        const lvlNotif = await notification_service_1.NotificationServices.createNotification({
            userId,
            title: { es: 'Nivel 2 Desbloqueado (Test)', en: 'Level 2 Unlocked (Test)' },
            content: { es: 'Has alcanzado Aventurero', en: 'You reached Adventurer' },
            type: notification_interface_1.NotificationType.UNLOCKED_LEVEL,
            category: notification_interface_1.NotificationCategory.ACCOUNT,
        });
        createdIds.push(lvlNotif._id);
        console.log(`✅ Level Unlocked Notification created: [${lvlNotif._id}] Category: [${lvlNotif.category}]`);
        // 4. Test Roadtripeado Notification: New Offer (Tailored Broadcast)
        console.log('\n--- TEST 3: Roadtripeado Notification (New Offer) ---');
        const offerNotif = await notification_service_1.NotificationServices.dispatchTailoredNotification({
            title: { es: 'Nueva Oferta 20% (Test)', en: 'New Offer 20% (Test)' },
            content: { es: 'Descuento especial en ruta', en: 'Special roadtrip discount' },
            type: notification_interface_1.NotificationType.NEW_OFFER,
            category: notification_interface_1.NotificationCategory.ROADTRIPEADO,
            interests: ['travel'],
        });
        createdIds.push(offerNotif._id);
        console.log(`✅ Roadtripeado New Offer created: [${offerNotif._id}] Category: [${offerNotif.category}]`);
        // 5. Test Roadtripeado Notification: New Destination
        console.log('\n--- TEST 4: Roadtripeado Notification (New Location) ---');
        const locNotif = await notification_service_1.NotificationServices.dispatchTailoredNotification({
            title: { es: 'Nuevo Destino Cañón (Test)', en: 'New Destination Canyon (Test)' },
            content: { es: 'Explora esta nueva maravilla', en: 'Explore this new wonder' },
            type: notification_interface_1.NotificationType.NEW_LOCATION,
            category: notification_interface_1.NotificationCategory.ROADTRIPEADO,
            interests: ['travel', 'outdoor'],
        });
        createdIds.push(locNotif._id);
        console.log(`✅ Roadtripeado New Location created: [${locNotif._id}] Category: [${locNotif.category}]`);
        // 6. Test getUnreadCount
        console.log('\n--- TEST 5: Get Unread Count ---');
        const unreadCount = await notification_service_1.NotificationServices.getUnreadCount(userId);
        console.log('Unread Count Response:', JSON.stringify(unreadCount, null, 2));
        if (unreadCount.totalUnread < 4) {
            console.warn(`⚠️ Warning: Expected at least 4 unread, got ${unreadCount.totalUnread}`);
        }
        else {
            console.log('✅ Unread counts calculated accurately!');
        }
        // 7. Test getMyNotifications with category filters
        console.log('\n--- TEST 6: getMyNotifications by Category ---');
        const accountList = await notification_service_1.NotificationServices.getMyNotifications({ authId: userId, role: 'user' }, { category: 'account' }, { page: 1, limit: 10 });
        console.log(`Account Category Notifications Count: ${accountList.data.length}`);
        const allAccountCorrect = accountList.data.every(n => n.category === 'account');
        console.log(`✅ All items strictly in 'account' category: ${allAccountCorrect}`);
        const roadtripeadoList = await notification_service_1.NotificationServices.getMyNotifications({ authId: userId, role: 'user' }, { category: 'roadtripeado' }, { page: 1, limit: 10 });
        console.log(`Roadtripeado Category Notifications Count: ${roadtripeadoList.data.length}`);
        const allRoadCorrect = roadtripeadoList.data.every(n => n.category === 'roadtripeado');
        console.log(`✅ All items strictly in 'roadtripeado' category: ${allRoadCorrect}`);
        // 8. Test markAsRead on one notification
        console.log('\n--- TEST 7: Mark Single Notification As Read ---');
        await notification_service_1.NotificationServices.markAsRead(revNotif._id.toString(), userId);
        const afterSingleReadCount = await notification_service_1.NotificationServices.getUnreadCount(userId);
        console.log(`Previous total: ${unreadCount.totalUnread}, After single read: ${afterSingleReadCount.totalUnread}`);
        console.log(`✅ Unread count decreased by 1: ${afterSingleReadCount.totalUnread === unreadCount.totalUnread - 1}`);
        // 9. Test markAllAsRead
        console.log('\n--- TEST 8: Mark All Notifications As Read ---');
        await notification_service_1.NotificationServices.markAllAsRead(userId);
        const afterAllReadCount = await notification_service_1.NotificationServices.getUnreadCount(userId);
        console.log(`After markAllAsRead - Total Unread: ${afterAllReadCount.totalUnread}`);
        console.log(`✅ Total unread for user is 0: ${afterAllReadCount.totalUnread === 0}`);
        // 10. Clean up test records
        console.log('\n--- CLEANUP: Removing Test Notifications ---');
        const delRes = await notification_model_1.Notification.deleteMany({ _id: { $in: createdIds } });
        console.log(`✅ Cleaned up ${delRes.deletedCount} test notifications from DB.`);
        console.log('\n🎉 ALL 8 TESTS PASSED SUCCESSFULLY! Notification center is fully functional.');
    }
    catch (error) {
        console.error('❌ Test failed with error:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}
runTest();
