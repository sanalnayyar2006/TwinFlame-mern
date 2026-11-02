import { api } from '../lib/api'
import type { DailyConnection } from '../types/dailyConnection'

const OFFLINE_MESSAGE = "Couldn't reach TwinFlame. Check your connection and try again."

// The server uses this to decide which day the couple is on
const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

// The shared api client returns the parsed body for every status, so check the shape
const request = async (call: () => Promise<unknown>): Promise<DailyConnection> => {
  let data: unknown
  try {
    data = await call()
  } catch {
    throw new Error(OFFLINE_MESSAGE)
  }
  if (data && typeof data === 'object' && 'prompt' in data && 'date' in data) {
    return data as DailyConnection
  }
  const message = data && typeof data === 'object' && 'message' in data ? String(data.message) : ''
  throw new Error(message || OFFLINE_MESSAGE)
}

export const dailyConnectionService = {
  getToday: () =>
    request(() => api.get(`/daily-connection?tz=${encodeURIComponent(timeZone())}`)),

  complete: (note: string) =>
    request(() => api.post('/daily-connection', { note, tz: timeZone() })),

  updateNote: (note: string) =>
    request(() => api.patch('/daily-connection', { note, tz: timeZone() }))
}
