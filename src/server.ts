import colors from 'colors'
import mongoose from 'mongoose'
import { Server } from 'socket.io'
import app from './app'
import config from './config'
import os from 'os'

import { Server as SocketServer } from 'socket.io'
import { UserServices } from './modules/user/user.service'
import { socketHelper } from './helpers/socketHelper'
import { geocodeAddress } from './utils/geocodeAddress'
import { seedSubscriptionPlans } from './modules/subscription/subscription.seed'
import { cronService } from './modules/subscription/cron.service'

// Uncaught exceptions
process.on('uncaughtException', error => {
  console.error('🔥 UncaughtException Detected:', error)
  process.exit(1)
})

export const onlineUsers = new Map()
let server: any

export let io: SocketServer

async function main() {
  try {
    await mongoose.connect(config.database_url as string)
    console.log(colors.green('🚀 Database connected successfully'))

    const port =
      typeof config.port === 'number' ? config.port : Number(config.port)

    const host = (config.ip_address as string) || '0.0.0.0'
    server = app.listen(port, host, () => {
      console.log(colors.yellow(`♻️  Server is running on:`))
      console.log(colors.cyan(`   - Local:    http://localhost:${port}`))

      const interfaces = os.networkInterfaces()
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]!) {
          if (iface.family === 'IPv4' && !iface.internal) {
            console.log(
              colors.cyan(`   - Network:  http://${iface.address}:${port}`),
            )
          }
        }
      }

      if (config.ip_address) {
        console.log(
          colors.green(
            `   - Requested IP: http://${config.ip_address}:${port}`,
          ),
        )
      }
    })

    // Socket.IO setup
    io = new Server(server, {
      pingTimeout: 60000,
      cors: { origin: '*' },
    })

    // Create admin user
    await UserServices.createAdmin()

    // Seed subscription plans
    await seedSubscriptionPlans()

    // Start subscription cron jobs
    cronService.startSubscriptionCronJobs()

    // Socket helper
    socketHelper.socket(io)
    //@ts-ignore
    global.io = io

    console.log(colors.green('🍁 Socket.IO initialized successfully'))
  } catch (error) {
    console.error(
      colors.red('🤢 Failed to start the server or connect to DB'),
      error,
    )
  }

  // Handle unhandled promise rejections
  process.on('unhandledRejection', error => {
    if (server) {
      server.close(() => {
        console.error('🔥 UnhandledRejection Detected:', error)
        process.exit(1)
      })
    } else {
      console.error('🔥 UnhandledRejection Detected:', error)
      process.exit(1)
    }
  })
}

// Start main
main()

// Graceful shutdown on SIGTERM
process.on('SIGTERM', async () => {
  console.log('👋 SIGTERM received, shutting down server...')
  if (server) {
    server.close()
  }
})
