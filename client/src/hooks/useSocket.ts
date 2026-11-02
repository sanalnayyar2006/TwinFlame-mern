import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { DailyConnectionUpdate } from '../types/dailyConnection'

interface MoodUpdate {
  userId: string
  mood: string | null
}

export interface SocketHandlers {
  onMoodUpdate?: (data: MoodUpdate) => void
  onDailyConnectionUpdate?: (data: DailyConnectionUpdate) => void
}

// One connection per page, so every real-time event goes through here
export function useSocket(token: string | null, handlers: SocketHandlers) {
  const socketRef = useRef<Socket | null>(null)
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    const socket = io('', {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    socketRef.current = socket

    socket.on('mood-updated', (data: MoodUpdate) => {
      handlersRef.current.onMoodUpdate?.(data)
    })

    socket.on('daily-connection-updated', (data: DailyConnectionUpdate) => {
      handlersRef.current.onDailyConnectionUpdate?.(data)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])
}
