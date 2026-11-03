export interface DailyResponse {
  note: string
  completedAt: string
  updatedAt: string
}

export interface Streak {
  // Consecutive days both partners answered (just you if no partner yet)
  current: number
  best: number
  todayCounts: boolean
}

export interface DailyConnection {
  date: string
  // true when partners are in different time zones and share the UTC day
  sharedClock: boolean
  prompt: string
  mine: DailyResponse | null
  partner: DailyResponse | null
  streak: Streak
}

export interface DailyConnectionUpdate {
  userId: string
  date: string
  response: DailyResponse
}

export const DAILY_NOTE_MAX = 500
