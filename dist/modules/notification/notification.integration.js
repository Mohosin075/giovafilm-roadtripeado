"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationIntegration = void 0;
const notification_service_1 = require("./notification.service");
const notification_interface_1 = require("./notification.interface");
const user_model_1 = require("../user/user.model");
const place_model_1 = require("../place/place.model");
const business_model_1 = require("../business/business.model");
class NotificationIntegration {
    static async onNewMessage(senderId, receiverId, message) {
        try {
            await notification_service_1.NotificationServices.createNotification({
                userId: receiverId,
                title: {
                    es: 'Nuevo Mensaje',
                    en: 'New Message',
                },
                content: {
                    es: `Tienes un nuevo mensaje: "${message.substring(0, 100)}..."`,
                    en: `You have a new message: "${message.substring(0, 100)}..."`,
                },
                type: notification_interface_1.NotificationType.NEW_MESSAGE,
                category: notification_interface_1.NotificationCategory.ACCOUNT,
                channel: notification_interface_1.NotificationChannel.IN_APP,
                priority: notification_interface_1.NotificationPriority.MEDIUM,
                metadata: {
                    senderId,
                    messagePreview: message.substring(0, 100),
                },
                actionUrl: `${process.env.CLIENT_URL || ''}/messages/${senderId}`,
                actionText: {
                    es: 'Ver Mensaje',
                    en: 'View Message',
                },
            });
        }
        catch (error) {
            console.error('Error creating message notification:', error);
        }
    }
    static async sendPasswordReset(userId, resetCode) {
        try {
            const user = await user_model_1.User.findById(userId);
            if (!user)
                return;
            await notification_service_1.NotificationServices.createNotification({
                userId: user._id,
                title: {
                    es: 'Solicitud de Restablecimiento de Contraseña',
                    en: 'Password Reset Request',
                },
                content: {
                    es: `Usa este código para restablecer tu contraseña: ${resetCode}`,
                    en: `Use this code to reset your password: ${resetCode}`,
                },
                type: notification_interface_1.NotificationType.PASSWORD_RESET,
                category: notification_interface_1.NotificationCategory.ACCOUNT,
                channel: notification_interface_1.NotificationChannel.EMAIL,
                priority: notification_interface_1.NotificationPriority.URGENT,
                metadata: {
                    resetCode,
                },
            }, true);
        }
        catch (error) {
            console.error('Error creating password reset notification:', error);
        }
    }
    static async sendAccountVerification(userId, verificationToken) {
        try {
            const user = await user_model_1.User.findById(userId);
            if (!user)
                return;
            await notification_service_1.NotificationServices.createNotification({
                userId: user._id,
                title: {
                    es: 'Verifica tu Cuenta',
                    en: 'Verify Your Account',
                },
                content: {
                    es: 'Por favor verifica tu dirección de correo electrónico para completar tu registro.',
                    en: 'Please verify your email address to complete your registration.',
                },
                type: notification_interface_1.NotificationType.ACCOUNT_VERIFICATION,
                category: notification_interface_1.NotificationCategory.ACCOUNT,
                channel: notification_interface_1.NotificationChannel.EMAIL,
                priority: notification_interface_1.NotificationPriority.HIGH,
                metadata: {
                    verificationToken,
                },
            }, true);
        }
        catch (error) {
            console.error('Error creating account verification notification:', error);
        }
    }
    /**
     * Dispatched when user's review is approved
     */
    static async onReviewApproved(payload) {
        try {
            const name = typeof payload.targetName === 'object' && payload.targetName
                ? (payload.targetName.en || payload.targetName.es || 'place')
                : String(payload.targetName || 'place');
            await notification_service_1.NotificationServices.createNotification({
                userId: payload.reviewerId,
                title: {
                    es: '¡Reseña aprobada! 🎉',
                    en: 'Review Approved! 🎉',
                },
                content: {
                    es: `¡Tu reseña sobre "${name}" fue aprobada! Ganaste +${payload.points} puntos de explorador.`,
                    en: `Your review for "${name}" was approved! You earned +${payload.points} explorer points.`,
                },
                type: notification_interface_1.NotificationType.APPROVED_REVIEW,
                category: notification_interface_1.NotificationCategory.ACCOUNT,
                priority: notification_interface_1.NotificationPriority.HIGH,
                actionUrl: payload.placeId
                    ? `/places/${payload.placeId}`
                    : `/places/${payload.businessId}?type=business`,
                actionText: {
                    es: 'Ver Reseña',
                    en: 'View Review',
                },
                metadata: {
                    placeId: payload.placeId,
                    businessId: payload.businessId,
                    pointsEarned: payload.points,
                },
            });
        }
        catch (error) {
            console.error('Error creating review approval notification:', error);
        }
    }
    /**
     * Dispatched when user's review is rejected
     */
    static async onReviewRejected(payload) {
        try {
            const name = typeof payload.targetName === 'object' && payload.targetName
                ? (payload.targetName.en || payload.targetName.es || 'place')
                : String(payload.targetName || 'place');
            await notification_service_1.NotificationServices.createNotification({
                userId: payload.reviewerId,
                title: {
                    es: 'Actualización sobre tu reseña',
                    en: 'Update on Your Review',
                },
                content: {
                    es: `Tu reseña sobre "${name}" no fue aprobada por nuestro equipo de moderación.`,
                    en: `Your review for "${name}" was not approved by our moderation team.`,
                },
                type: notification_interface_1.NotificationType.REJECTED_REVIEW,
                category: notification_interface_1.NotificationCategory.ACCOUNT,
                priority: notification_interface_1.NotificationPriority.MEDIUM,
                actionUrl: '/profile/contributions-reviews',
                actionText: {
                    es: 'Mis Reseñas',
                    en: 'My Reviews',
                },
                metadata: {
                    placeId: payload.placeId,
                    businessId: payload.businessId,
                },
            });
        }
        catch (error) {
            console.error('Error creating review rejection notification:', error);
        }
    }
    /**
     * Dispatched when a user unlocks a new level (e.g. Aventurero, Tlacuilo, Expedicionario)
     */
    static async onLevelUnlocked(payload) {
        try {
            await notification_service_1.NotificationServices.createNotification({
                userId: payload.userId,
                title: {
                    es: `¡Has subido al Nivel ${payload.newLevel}: ${payload.levelName}! 🌟`,
                    en: `You unlocked Level ${payload.newLevel}: ${payload.levelName}! 🌟`,
                },
                content: {
                    es: `¡Felicidades! Has alcanzado un nuevo nivel de explorador. Revisa tus nuevas recompensas y beneficios.`,
                    en: `Congratulations! You reached a new explorer level. Check out your new rewards and perks.`,
                },
                type: notification_interface_1.NotificationType.UNLOCKED_LEVEL,
                category: notification_interface_1.NotificationCategory.ACCOUNT,
                priority: notification_interface_1.NotificationPriority.HIGH,
                actionUrl: '/profile/awards',
                actionText: {
                    es: 'Ver Recompensas',
                    en: 'View Rewards',
                },
                metadata: {
                    newLevel: payload.newLevel,
                    levelName: payload.levelName,
                    oldLevel: payload.oldLevel,
                },
            });
        }
        catch (error) {
            console.error('Error creating level unlocked notification:', error);
        }
    }
    /**
     * Dispatched when a user earns/unlocks an award or reward
     */
    static async onRewardEarned(payload) {
        try {
            await notification_service_1.NotificationServices.createNotification({
                userId: payload.userId,
                title: {
                    es: '¡Recompensa desbloqueada! 🏆',
                    en: 'Reward Unlocked! 🏆',
                },
                content: {
                    es: `¡Enhorabuena! Has desbloqueado la recompensa: "${payload.rewardTitle}".`,
                    en: `Congratulations! You unlocked the reward: "${payload.rewardTitle}".`,
                },
                type: notification_interface_1.NotificationType.EARNED_REWARD,
                category: notification_interface_1.NotificationCategory.ACCOUNT,
                priority: notification_interface_1.NotificationPriority.HIGH,
                actionUrl: '/profile/awards',
                actionText: {
                    es: 'Reclamar / Ver Premio',
                    en: 'Claim / View Award',
                },
                metadata: {
                    rewardType: payload.rewardType,
                    awardId: payload.awardId,
                },
            });
        }
        catch (error) {
            console.error('Error creating reward earned notification:', error);
        }
    }
    /**
     * Dispatched when a new offer is created or activated (tailored to user's interests)
     */
    static async onNewOffer(offer) {
        var _a;
        try {
            const offerTitleEs = typeof offer.title === 'object' && offer.title !== null
                ? offer.title.es || offer.title.en || 'Nueva Oferta'
                : offer.title || 'Nueva Oferta';
            const offerTitleEn = typeof offer.title === 'object' && offer.title !== null
                ? offer.title.en || offer.title.es || 'New Offer'
                : offer.title || 'New Offer';
            let placeName = '';
            let country = '';
            const interests = ['travel'];
            if (offer.place) {
                const place = await place_model_1.Place.findById(offer.place).populate('category').lean();
                if (place) {
                    placeName =
                        typeof place.name === 'object' && place.name !== null
                            ? place.name.es || place.name.en || ''
                            : place.name || '';
                    country = place.country || '';
                }
            }
            else if (offer.business) {
                const business = await business_model_1.Business.findById(offer.business).lean();
                if (business) {
                    placeName =
                        typeof business.name === 'object' && business.name !== null
                            ? business.name.es || business.name.en || ''
                            : business.name || '';
                    country = ((_a = business.location) === null || _a === void 0 ? void 0 : _a.country) || '';
                }
            }
            await notification_service_1.NotificationServices.dispatchTailoredNotification({
                title: {
                    es: `¡Nueva oferta: ${offerTitleEs}! 🏷️`,
                    en: `New Offer: ${offerTitleEn}! 🏷️`,
                },
                content: {
                    es: `Descubre una nueva oferta especial en Roadtripeado${placeName ? ` en "${placeName}"` : ''}. ¡Aprovéchala antes de que termine!`,
                    en: `Discover a special new offer on Roadtripeado${placeName ? ` at "${placeName}"` : ''}. Don't miss out!`,
                },
                type: notification_interface_1.NotificationType.NEW_OFFER,
                category: notification_interface_1.NotificationCategory.ROADTRIPEADO,
                priority: notification_interface_1.NotificationPriority.MEDIUM,
                interests,
                country: country || undefined,
                actionUrl: `/offers/${offer._id}`,
                actionText: {
                    es: 'Ver Oferta',
                    en: 'View Offer',
                },
                metadata: {
                    offerId: offer._id,
                    placeId: offer.place,
                    businessId: offer.business,
                    discountType: offer.discountType,
                },
            });
        }
        catch (error) {
            console.error('Error creating new offer notification:', error);
        }
    }
    /**
     * Dispatched when a new location/place is added or published (tailored to user's interests)
     */
    static async onNewLocation(place) {
        try {
            const placeNameEs = typeof place.name === 'object' && place.name !== null
                ? place.name.es || place.name.en || 'Nuevo Lugar'
                : place.name || 'Nuevo Lugar';
            const placeNameEn = typeof place.name === 'object' && place.name !== null
                ? place.name.en || place.name.es || 'New Destination'
                : place.name || 'New Destination';
            const country = place.country || 'Roadtripeado';
            await notification_service_1.NotificationServices.dispatchTailoredNotification({
                title: {
                    es: `¡Nuevo destino: ${placeNameEs}! 📍`,
                    en: `New Destination: ${placeNameEn}! 📍`,
                },
                content: {
                    es: `Se ha añadido un nuevo lugar para explorar en ${country}: "${placeNameEs}". ¡Añádelo a tu próxima ruta!`,
                    en: `A new place to explore has been added in ${country}: "${placeNameEn}". Add it to your next route!`,
                },
                type: notification_interface_1.NotificationType.NEW_LOCATION,
                category: notification_interface_1.NotificationCategory.ROADTRIPEADO,
                priority: notification_interface_1.NotificationPriority.MEDIUM,
                interests: ['outdoor', 'travel'],
                country: place.country || undefined,
                actionUrl: `/places/${place._id}`,
                actionText: {
                    es: 'Explorar Lugar',
                    en: 'Explore Place',
                },
                metadata: {
                    placeId: place._id,
                    country: place.country,
                    mapId: place.map,
                },
            });
        }
        catch (error) {
            console.error('Error creating new location notification:', error);
        }
    }
    /**
     * Dispatched when a new map is published
     */
    static async onNewMap(map) {
        try {
            const mapNameEs = typeof map.name === 'object' && map.name !== null
                ? map.name.es || map.name.en || 'Nuevo Mapa'
                : map.name || 'Nuevo Mapa';
            const mapNameEn = typeof map.name === 'object' && map.name !== null
                ? map.name.en || map.name.es || 'New Map'
                : map.name || 'New Map';
            await notification_service_1.NotificationServices.dispatchTailoredNotification({
                title: {
                    es: `¡Nuevo mapa publicado: ${mapNameEs}! 🗺️`,
                    en: `New Map Published: ${mapNameEn}! 🗺️`,
                },
                content: {
                    es: `Un nuevo mapa interactivo "${mapNameEs}" ya está disponible en Roadtripeado. Explora nuevas rutas y secretos.`,
                    en: `A new interactive map "${mapNameEn}" is now available on Roadtripeado. Explore new routes and scenic spots.`,
                },
                type: notification_interface_1.NotificationType.NEW_MAP,
                category: notification_interface_1.NotificationCategory.ROADTRIPEADO,
                priority: notification_interface_1.NotificationPriority.MEDIUM,
                interests: ['travel', 'outdoor'],
                country: map.country || undefined,
                actionUrl: `/maps/${map._id}`,
                actionText: {
                    es: 'Ver Mapa',
                    en: 'View Map',
                },
                metadata: {
                    mapId: map._id,
                    country: map.country,
                },
            });
        }
        catch (error) {
            console.error('Error creating new map notification:', error);
        }
    }
    /**
     * Dispatched for important platform updates or announcements
     */
    static async onImportantUpdate(payload) {
        try {
            await notification_service_1.NotificationServices.dispatchTailoredNotification({
                title: payload.title,
                content: payload.content,
                type: notification_interface_1.NotificationType.IMPORTANT_UPDATE,
                category: notification_interface_1.NotificationCategory.ROADTRIPEADO,
                priority: notification_interface_1.NotificationPriority.HIGH,
                actionUrl: payload.actionUrl,
                actionText: payload.actionText,
            });
        }
        catch (error) {
            console.error('Error creating important update notification:', error);
        }
    }
}
exports.NotificationIntegration = NotificationIntegration;
exports.default = NotificationIntegration;
