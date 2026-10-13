import { Types } from 'mongoose'
import { NotificationServices } from './notification.service'
import {
  NotificationType,
  NotificationCategory,
  NotificationChannel,
  NotificationPriority,
  TARGET_AUDIENCE,
} from './notification.interface'
import { User } from '../user/user.model'
import { Place } from '../place/place.model'
import { Business } from '../business/business.model'

export class NotificationIntegration {
  static async onNewMessage(
    senderId: Types.ObjectId,
    receiverId: Types.ObjectId,
    message: string,
  ): Promise<void> {
    try {
      await NotificationServices.createNotification({
        userId: receiverId,
        title: {
          es: 'Nuevo Mensaje',
          en: 'New Message',
        },
        content: {
          es: `Tienes un nuevo mensaje: "${message.substring(0, 100)}..."`,
          en: `You have a new message: "${message.substring(0, 100)}..."`,
        },
        type: NotificationType.NEW_MESSAGE,
        category: NotificationCategory.ACCOUNT,
        channel: NotificationChannel.IN_APP,
        priority: NotificationPriority.MEDIUM,
        metadata: {
          senderId,
          messagePreview: message.substring(0, 100),
        },
        actionUrl: `${process.env.CLIENT_URL || ''}/messages/${senderId}`,
        actionText: {
          es: 'Ver Mensaje',
          en: 'View Message',
        },
      })
    } catch (error) {
      console.error('Error creating message notification:', error)
    }
  }

  static async sendPasswordReset(
    userId: Types.ObjectId,
    resetCode: string,
  ): Promise<void> {
    try {
      const user = await User.findById(userId)
      if (!user) return

      await NotificationServices.createNotification(
        {
          userId: user._id,
          title: {
            es: 'Solicitud de Restablecimiento de Contraseña',
            en: 'Password Reset Request',
          },
          content: {
            es: `Usa este código para restablecer tu contraseña: ${resetCode}`,
            en: `Use this code to reset your password: ${resetCode}`,
          },
          type: NotificationType.PASSWORD_RESET,
          category: NotificationCategory.ACCOUNT,
          channel: NotificationChannel.EMAIL,
          priority: NotificationPriority.URGENT,
          metadata: {
            resetCode,
          },
        },
        true,
      )
    } catch (error) {
      console.error('Error creating password reset notification:', error)
    }
  }

  static async sendAccountVerification(
    userId: Types.ObjectId,
    verificationToken: string,
  ): Promise<void> {
    try {
      const user = await User.findById(userId)
      if (!user) return

      await NotificationServices.createNotification(
        {
          userId: user._id,
          title: {
            es: 'Verifica tu Cuenta',
            en: 'Verify Your Account',
          },
          content: {
            es: 'Por favor verifica tu dirección de correo electrónico para completar tu registro.',
            en: 'Please verify your email address to complete your registration.',
          },
          type: NotificationType.ACCOUNT_VERIFICATION,
          category: NotificationCategory.ACCOUNT,
          channel: NotificationChannel.EMAIL,
          priority: NotificationPriority.HIGH,
          metadata: {
            verificationToken,
          },
        },
        true,
      )
    } catch (error) {
      console.error('Error creating account verification notification:', error)
    }
  }

  /**
   * Dispatched when user's review is approved
   */
  static async onReviewApproved(payload: {
    reviewerId: Types.ObjectId | string
    targetName: string
    points: number
    placeId?: Types.ObjectId | string
    businessId?: Types.ObjectId | string
  }): Promise<void> {
    try {
      await NotificationServices.createNotification({
        userId: payload.reviewerId,
        title: {
          es: '¡Reseña aprobada! 🎉',
          en: 'Review Approved! 🎉',
        },
        content: {
          es: `¡Tu reseña sobre "${payload.targetName}" fue aprobada! Ganaste +${payload.points} puntos de explorador.`,
          en: `Your review for "${payload.targetName}" was approved! You earned +${payload.points} explorer points.`,
        },
        type: NotificationType.APPROVED_REVIEW,
        category: NotificationCategory.ACCOUNT,
        priority: NotificationPriority.HIGH,
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
      })
    } catch (error) {
      console.error('Error creating review approval notification:', error)
    }
  }

  /**
   * Dispatched when user's review is rejected
   */
  static async onReviewRejected(payload: {
    reviewerId: Types.ObjectId | string
    targetName: string
    placeId?: Types.ObjectId | string
    businessId?: Types.ObjectId | string
  }): Promise<void> {
    try {
      await NotificationServices.createNotification({
        userId: payload.reviewerId,
        title: {
          es: 'Actualización sobre tu reseña',
          en: 'Update on Your Review',
        },
        content: {
          es: `Tu reseña sobre "${payload.targetName}" no fue aprobada por nuestro equipo de moderación.`,
          en: `Your review for "${payload.targetName}" was not approved by our moderation team.`,
        },
        type: NotificationType.REJECTED_REVIEW,
        category: NotificationCategory.ACCOUNT,
        priority: NotificationPriority.MEDIUM,
        actionUrl: '/profile/contributions-reviews',
        actionText: {
          es: 'Mis Reseñas',
          en: 'My Reviews',
        },
        metadata: {
          placeId: payload.placeId,
          businessId: payload.businessId,
        },
      })
    } catch (error) {
      console.error('Error creating review rejection notification:', error)
    }
  }

  /**
   * Dispatched when a user unlocks a new level (e.g. Aventurero, Tlacuilo, Expedicionario)
   */
  static async onLevelUnlocked(payload: {
    userId: Types.ObjectId | string
    newLevel: number
    levelName: string
    oldLevel?: number
  }): Promise<void> {
    try {
      await NotificationServices.createNotification({
        userId: payload.userId,
        title: {
          es: `¡Has subido al Nivel ${payload.newLevel}: ${payload.levelName}! 🌟`,
          en: `You unlocked Level ${payload.newLevel}: ${payload.levelName}! 🌟`,
        },
        content: {
          es: `¡Felicidades! Has alcanzado un nuevo nivel de explorador. Revisa tus nuevas recompensas y beneficios.`,
          en: `Congratulations! You reached a new explorer level. Check out your new rewards and perks.`,
        },
        type: NotificationType.UNLOCKED_LEVEL,
        category: NotificationCategory.ACCOUNT,
        priority: NotificationPriority.HIGH,
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
      })
    } catch (error) {
      console.error('Error creating level unlocked notification:', error)
    }
  }

  /**
   * Dispatched when a user earns/unlocks an award or reward
   */
  static async onRewardEarned(payload: {
    userId: Types.ObjectId | string
    rewardTitle: string
    rewardType: string
    awardId?: Types.ObjectId | string
  }): Promise<void> {
    try {
      await NotificationServices.createNotification({
        userId: payload.userId,
        title: {
          es: '¡Recompensa desbloqueada! 🏆',
          en: 'Reward Unlocked! 🏆',
        },
        content: {
          es: `¡Enhorabuena! Has desbloqueado la recompensa: "${payload.rewardTitle}".`,
          en: `Congratulations! You unlocked the reward: "${payload.rewardTitle}".`,
        },
        type: NotificationType.EARNED_REWARD,
        category: NotificationCategory.ACCOUNT,
        priority: NotificationPriority.HIGH,
        actionUrl: '/profile/awards',
        actionText: {
          es: 'Reclamar / Ver Premio',
          en: 'Claim / View Award',
        },
        metadata: {
          rewardType: payload.rewardType,
          awardId: payload.awardId,
        },
      })
    } catch (error) {
      console.error('Error creating reward earned notification:', error)
    }
  }

  /**
   * Dispatched when a new offer is created or activated (tailored to user's interests)
   */
  static async onNewOffer(offer: any): Promise<void> {
    try {
      const offerTitleEs =
        typeof offer.title === 'object' && offer.title !== null
          ? offer.title.es || offer.title.en || 'Nueva Oferta'
          : offer.title || 'Nueva Oferta'
      const offerTitleEn =
        typeof offer.title === 'object' && offer.title !== null
          ? offer.title.en || offer.title.es || 'New Offer'
          : offer.title || 'New Offer'

      let placeName = ''
      let country = ''
      const interests: string[] = ['travel']

      if (offer.place) {
        const place = await Place.findById(offer.place).populate('category').lean()
        if (place) {
          placeName =
            typeof place.name === 'object' && place.name !== null
              ? (place.name as any).es || (place.name as any).en || ''
              : place.name || ''
          country = place.country || ''
        }
      } else if (offer.business) {
        const business = await Business.findById(offer.business).lean()
        if (business) {
          placeName =
            typeof business.name === 'object' && business.name !== null
              ? (business.name as any).es || (business.name as any).en || ''
              : business.name || ''
          country = business.location?.country || ''
        }
      }

      await NotificationServices.dispatchTailoredNotification({
        title: {
          es: `¡Nueva oferta: ${offerTitleEs}! 🏷️`,
          en: `New Offer: ${offerTitleEn}! 🏷️`,
        },
        content: {
          es: `Descubre una nueva oferta especial en Roadtripeado${
            placeName ? ` en "${placeName}"` : ''
          }. ¡Aprovéchala antes de que termine!`,
          en: `Discover a special new offer on Roadtripeado${
            placeName ? ` at "${placeName}"` : ''
          }. Don't miss out!`,
        },
        type: NotificationType.NEW_OFFER,
        category: NotificationCategory.ROADTRIPEADO,
        priority: NotificationPriority.MEDIUM,
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
      })
    } catch (error) {
      console.error('Error creating new offer notification:', error)
    }
  }

  /**
   * Dispatched when a new location/place is added or published (tailored to user's interests)
   */
  static async onNewLocation(place: any): Promise<void> {
    try {
      const placeNameEs =
        typeof place.name === 'object' && place.name !== null
          ? place.name.es || place.name.en || 'Nuevo Lugar'
          : place.name || 'Nuevo Lugar'
      const placeNameEn =
        typeof place.name === 'object' && place.name !== null
          ? place.name.en || place.name.es || 'New Destination'
          : place.name || 'New Destination'

      const country = place.country || 'Roadtripeado'

      await NotificationServices.dispatchTailoredNotification({
        title: {
          es: `¡Nuevo destino: ${placeNameEs}! 📍`,
          en: `New Destination: ${placeNameEn}! 📍`,
        },
        content: {
          es: `Se ha añadido un nuevo lugar para explorar en ${country}: "${placeNameEs}". ¡Añádelo a tu próxima ruta!`,
          en: `A new place to explore has been added in ${country}: "${placeNameEn}". Add it to your next route!`,
        },
        type: NotificationType.NEW_LOCATION,
        category: NotificationCategory.ROADTRIPEADO,
        priority: NotificationPriority.MEDIUM,
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
      })
    } catch (error) {
      console.error('Error creating new location notification:', error)
    }
  }

  /**
   * Dispatched when a new map is published
   */
  static async onNewMap(map: any): Promise<void> {
    try {
      const mapNameEs =
        typeof map.name === 'object' && map.name !== null
          ? map.name.es || map.name.en || 'Nuevo Mapa'
          : map.name || 'Nuevo Mapa'
      const mapNameEn =
        typeof map.name === 'object' && map.name !== null
          ? map.name.en || map.name.es || 'New Map'
          : map.name || 'New Map'

      await NotificationServices.dispatchTailoredNotification({
        title: {
          es: `¡Nuevo mapa publicado: ${mapNameEs}! 🗺️`,
          en: `New Map Published: ${mapNameEn}! 🗺️`,
        },
        content: {
          es: `Un nuevo mapa interactivo "${mapNameEs}" ya está disponible en Roadtripeado. Explora nuevas rutas y secretos.`,
          en: `A new interactive map "${mapNameEn}" is now available on Roadtripeado. Explore new routes and scenic spots.`,
        },
        type: NotificationType.NEW_MAP,
        category: NotificationCategory.ROADTRIPEADO,
        priority: NotificationPriority.MEDIUM,
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
      })
    } catch (error) {
      console.error('Error creating new map notification:', error)
    }
  }

  /**
   * Dispatched for important platform updates or announcements
   */
  static async onImportantUpdate(payload: {
    title: string | { en: string; es: string }
    content: string | { en: string; es: string }
    targetAudience?: TARGET_AUDIENCE
    actionUrl?: string
    actionText?: string | { en: string; es: string }
  }): Promise<void> {
    try {
      await NotificationServices.dispatchTailoredNotification({
        title: payload.title,
        content: payload.content,
        type: NotificationType.IMPORTANT_UPDATE,
        category: NotificationCategory.ROADTRIPEADO,
        priority: NotificationPriority.HIGH,
        actionUrl: payload.actionUrl,
        actionText: payload.actionText,
      })
    } catch (error) {
      console.error('Error creating important update notification:', error)
    }
  }
}

export default NotificationIntegration
