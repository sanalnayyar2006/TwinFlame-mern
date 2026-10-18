import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'

interface MoodUpdate {
  userId: string
  mood: string | null
}

export function useSocket(token: string | null, onMoodUpdate: (data: MoodUpdate) => void) {
  const socketRef = useRef<Socket | null>(null)
  const cbRef = useRef(onMoodUpdate)
  cbRef.current = onMoodUpdate

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
      cbRef.current(data)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])
}
