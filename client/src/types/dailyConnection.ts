export interface DailyResponse {
  note: string
  completedAt: string
  updatedAt: string
}

export interface DailyConnection {
  date: string
  // true when partners are in different time zones and share the UTC day
  sharedClock: boolean
  prompt: string
  mine: DailyResponse | null
  partner: DailyResponse | null
}

export interface DailyConnectionUpdate {
  userId: string
  date: string
  response: DailyResponse
}

export const DAILY_NOTE_MAX = 500
