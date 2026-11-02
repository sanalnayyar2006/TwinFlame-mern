export const isValidTimeZone = (tz: unknown): tz is string => {
  if (typeof tz !== 'string' || !tz) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

// en-CA formats as YYYY-MM-DD
const dateIn = (tz: string, now: Date): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)

const offsetMinutes = (tz: string, now: Date): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric'
  }).formatToParts(now)
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'))
  return Math.round((asUtc - now.getTime()) / 60_000)
}

export interface CoupleDay {
  date: string
  sharedClock: boolean
}

// Partners in the same time zone (same UTC offset right now) use their local day.
// Partners in different time zones share UTC so they always land on the same day.
// An unknown partner time zone counts as "same" until they open the app.
export const resolveCoupleDay = (myTz: string | null, partnerTz: string | null, now = new Date()): CoupleDay => {
  if (!myTz) return { date: dateIn('UTC', now), sharedClock: true }
  if (!partnerTz || offsetMinutes(myTz, now) === offsetMinutes(partnerTz, now)) {
    return { date: dateIn(myTz, now), sharedClock: false }
  }
  return { date: dateIn('UTC', now), sharedClock: true }
}
