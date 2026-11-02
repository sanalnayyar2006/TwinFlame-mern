import { api } from '../lib/api'
import { request, hasKeys } from './request'
import type { DailyConnection } from '../types/dailyConnection'

// The server uses this to decide which day the couple is on
const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone
const isConnection = hasKeys('prompt', 'date')

export const dailyConnectionService = {
  getToday: () =>
    request<DailyConnection>(() => api.get(`/daily-connection?tz=${encodeURIComponent(timeZone())}`), isConnection),

  complete: (note: string) =>
    request<DailyConnection>(() => api.post('/daily-connection', { note, tz: timeZone() }), isConnection),

  updateNote: (note: string) =>
    request<DailyConnection>(() => api.patch('/daily-connection', { note, tz: timeZone() }), isConnection)
}
