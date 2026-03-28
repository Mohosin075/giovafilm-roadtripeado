import { UserRoutes } from '../modules/user/user.route'
import { AuthRoutes } from '../modules/auth/auth.route'
import express, { Router } from 'express'
import { PublicRoutes } from '../modules/public/public.route'
import { SupportRoutes } from '../modules/support/support.route'
import { UploadRoutes } from '../modules/upload/upload.route'

import { NotificationRoutes } from '../modules/notification/notification.routes'
import { MessageRoutes } from '../modules/message/message.routes'
import { ChatRoutes } from '../modules/chat/chat.routes'
import { ReviewRoutes } from '../modules/review/review.route'
import { SubscriptionRoutes } from '../modules/subscription/subscription.route'
import { CategoryRoutes } from '../modules/category/category.route'
import { PlaceRoutes } from '../modules/place/place.route'
import { OfferRoutes } from '../modules/offer/offer.route'
import { StatusCodes } from 'http-status-codes'

const router = express.Router()

const apiRoutes: { path: string; route: Router }[] = [
  { path: '/user', route: UserRoutes },
  { path: '/auth', route: AuthRoutes },
  { path: '/notifications', route: NotificationRoutes },
  { path: '/public', route: PublicRoutes },
  { path: '/support', route: SupportRoutes },
  { path: '/upload', route: UploadRoutes },

  { path: '/message', route: MessageRoutes },
  { path: '/chat', route: ChatRoutes },
  { path: '/review', route: ReviewRoutes },
  { path: '/subscription', route: SubscriptionRoutes },
  { path: '/category', route: CategoryRoutes },
  { path: '/place', route: PlaceRoutes },
  { path: '/offer', route: OfferRoutes },
]

apiRoutes.forEach(route => {
  router.use(route.path, route.route)
})

router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Server is running smoothly',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
  })
})

export default router
