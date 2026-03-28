// import { INotification } from '../modules/notification/notification.interface'
// import { Notification } from '../modules/notification/notification.model'
// import { User } from '../modules/user/user.model'
// import { TARGET_AUDIENCE } from '../enum/notification'

// export const sendNotifications = async (
//   data: Partial<INotification>,
// ): Promise<INotification> => {
//   const result = await Notification.create(data)

//   //@ts-ignore
//   const socketIo = global.io

//   if (socketIo) {
//     if (data.receiver) {
//       // Single user notification
//       socketIo.emit(`getNotification::${data.receiver}`, result)
//     } else if (data.targetAudience === TARGET_AUDIENCE.ALL_USER) {
//       // Broadcast to all users
//       socketIo.emit('broadcastNotification', result)
//     }
//   }

//   return result
// }
