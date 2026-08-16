import colors from 'colors'
import { Server } from 'socket.io'
import { recordUniqueUsage } from '../modules/stats/usage.service'
import { UsageView } from '../modules/stats/usageView.model'

const socket = (io: Server) => {
  UsageView.syncIndexes().catch(error => {
    console.error('Failed to sync usage view indexes:', error)
  })

  io.on('connection', socket => {
    console.log(colors.blue('A user connected'), socket.id)

    socket.on('join-room', (roomId: string) => {
      if (roomId) {
        socket.join(`room:${roomId}`)
        console.log(colors.green(`User ${socket.id} joined room:${roomId}`))
      }
    })

    socket.on('leave-room', (roomId: string) => {
      if (roomId) {
        socket.leave(`room:${roomId}`)
        console.log(colors.yellow(`User ${socket.id} left room:${roomId}`))
      }
    })

    socket.on(
      'track-usage',
      async (payload?: {
        type?: string
        id?: string
        visitorId?: string
        token?: string
      }) => {
        try {
          await recordUniqueUsage(socket, payload)
        } catch (error) {
          console.error('Failed to record usage via socket:', error)
        }
      },
    )

    socket.on('disconnect', () => {
      console.log(colors.red('A user disconnect'), socket.id)
    })
  })
}

export const socketHelper = { socket }
