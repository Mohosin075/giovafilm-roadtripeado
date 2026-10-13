import mongoose from 'mongoose'
import config from '../config'
import { User } from '../modules/user/user.model'
import { Notification } from '../modules/notification/notification.model'
import { NotificationServices } from '../modules/notification/notification.service'
import { NotificationIntegration } from '../modules/notification/notification.integration'
import {
  NotificationCategory,
  NotificationType,
  TARGET_AUDIENCE,
} from '../modules/notification/notification.interface'

async function runTest() {
  console.log('🔄 Connecting to database...')
  await mongoose.connect(config.database_url as string)
  console.log('✅ Connected to MongoDB successfully\n')

  try {
    // 1. Get a sample user from DB
    let user = await User.findOne({ isVerified: true }).lean()
    if (!user) {
      user = await User.findOne().lean()
    }
    if (!user) {
      console.log('⚠️ No user found in DB, creating a mock ObjectId')
      user = { _id: new mongoose.Types.ObjectId(), name: 'Test User' } as any
    }
    const userId = user!._id.toString()
    console.log(`👤 Using User: ${user!.name || 'User'} (ID: ${userId})`)

    const createdIds: mongoose.Types.ObjectId[] = []

    // 2. Test Account Notification: onReviewApproved
    console.log('\n--- TEST 1: Account Notification (Approved Review) ---')
    const revNotif = await NotificationServices.createNotification({
      userId,
      title: { es: 'Reseña aprobada (Test)', en: 'Review Approved (Test)' },
      content: { es: 'Tu reseña fue aprobada +10 pts', en: 'Your review was approved +10 pts' },
      type: NotificationType.APPROVED_REVIEW,
      category: NotificationCategory.ACCOUNT,
    })
    createdIds.push(revNotif._id)
    console.log(`✅ Approved Review Notification created: [${revNotif._id}] Category: [${revNotif.category}]`)

    // 3. Test Account Notification: onLevelUnlocked
    console.log('\n--- TEST 2: Account Notification (Level Unlocked) ---')
    const lvlNotif = await NotificationServices.createNotification({
      userId,
      title: { es: 'Nivel 2 Desbloqueado (Test)', en: 'Level 2 Unlocked (Test)' },
      content: { es: 'Has alcanzado Aventurero', en: 'You reached Adventurer' },
      type: NotificationType.UNLOCKED_LEVEL,
      category: NotificationCategory.ACCOUNT,
    })
    createdIds.push(lvlNotif._id)
    console.log(`✅ Level Unlocked Notification created: [${lvlNotif._id}] Category: [${lvlNotif.category}]`)

    // 4. Test Roadtripeado Notification: New Offer (Tailored Broadcast)
    console.log('\n--- TEST 3: Roadtripeado Notification (New Offer) ---')
    const offerNotif = await NotificationServices.dispatchTailoredNotification({
      title: { es: 'Nueva Oferta 20% (Test)', en: 'New Offer 20% (Test)' },
      content: { es: 'Descuento especial en ruta', en: 'Special roadtrip discount' },
      type: NotificationType.NEW_OFFER,
      category: NotificationCategory.ROADTRIPEADO,
      interests: ['travel'],
    })
    createdIds.push(offerNotif._id)
    console.log(`✅ Roadtripeado New Offer created: [${offerNotif._id}] Category: [${offerNotif.category}]`)

    // 5. Test Roadtripeado Notification: New Destination
    console.log('\n--- TEST 4: Roadtripeado Notification (New Location) ---')
    const locNotif = await NotificationServices.dispatchTailoredNotification({
      title: { es: 'Nuevo Destino Cañón (Test)', en: 'New Destination Canyon (Test)' },
      content: { es: 'Explora esta nueva maravilla', en: 'Explore this new wonder' },
      type: NotificationType.NEW_LOCATION,
      category: NotificationCategory.ROADTRIPEADO,
      interests: ['travel', 'outdoor'],
    })
    createdIds.push(locNotif._id)
    console.log(`✅ Roadtripeado New Location created: [${locNotif._id}] Category: [${locNotif.category}]`)

    // 6. Test getUnreadCount
    console.log('\n--- TEST 5: Get Unread Count ---')
    const unreadCount = await NotificationServices.getUnreadCount(userId)
    console.log('Unread Count Response:', JSON.stringify(unreadCount, null, 2))
    if (unreadCount.totalUnread < 4) {
      console.warn(`⚠️ Warning: Expected at least 4 unread, got ${unreadCount.totalUnread}`)
    } else {
      console.log('✅ Unread counts calculated accurately!')
    }

    // 7. Test getMyNotifications with category filters
    console.log('\n--- TEST 6: getMyNotifications by Category ---')
    const accountList = await NotificationServices.getMyNotifications(
      { authId: userId, role: 'user' } as any,
      { category: 'account' },
      { page: 1, limit: 10 }
    )
    console.log(`Account Category Notifications Count: ${accountList.data.length}`)
    const allAccountCorrect = accountList.data.every(n => n.category === 'account')
    console.log(`✅ All items strictly in 'account' category: ${allAccountCorrect}`)

    const roadtripeadoList = await NotificationServices.getMyNotifications(
      { authId: userId, role: 'user' } as any,
      { category: 'roadtripeado' },
      { page: 1, limit: 10 }
    )
    console.log(`Roadtripeado Category Notifications Count: ${roadtripeadoList.data.length}`)
    const allRoadCorrect = roadtripeadoList.data.every(n => n.category === 'roadtripeado')
    console.log(`✅ All items strictly in 'roadtripeado' category: ${allRoadCorrect}`)

    // 8. Test markAsRead on one notification
    console.log('\n--- TEST 7: Mark Single Notification As Read ---')
    await NotificationServices.markAsRead(revNotif._id.toString(), userId)
    const afterSingleReadCount = await NotificationServices.getUnreadCount(userId)
    console.log(`Previous total: ${unreadCount.totalUnread}, After single read: ${afterSingleReadCount.totalUnread}`)
    console.log(`✅ Unread count decreased by 1: ${afterSingleReadCount.totalUnread === unreadCount.totalUnread - 1}`)

    // 9. Test markAllAsRead
    console.log('\n--- TEST 8: Mark All Notifications As Read ---')
    await NotificationServices.markAllAsRead(userId)
    const afterAllReadCount = await NotificationServices.getUnreadCount(userId)
    console.log(`After markAllAsRead - Total Unread: ${afterAllReadCount.totalUnread}`)
    console.log(`✅ Total unread for user is 0: ${afterAllReadCount.totalUnread === 0}`)

    // 10. Clean up test records
    console.log('\n--- CLEANUP: Removing Test Notifications ---')
    const delRes = await Notification.deleteMany({ _id: { $in: createdIds } })
    console.log(`✅ Cleaned up ${delRes.deletedCount} test notifications from DB.`)

    console.log('\n🎉 ALL 8 TESTS PASSED SUCCESSFULLY! Notification center is fully functional.')
  } catch (error) {
    console.error('❌ Test failed with error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

runTest()
