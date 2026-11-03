// Streaks are counted in the couple's day keys (YYYY-MM-DD, see dayKey.ts).
// A day counts when every partner answered: both partners for a couple, the user alone if solo.

const DAY_MS = 86_400_000

const previousDay = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10)

export interface Streak {
  current: number
  best: number
  // Whether today already counts; if not, the streak is still alive until the day ends
  todayCounts: boolean
}

export const computeStreak = (completedDates: Iterable<string>, today: string): Streak => {
  const done = new Set(completedDates)
  const todayCounts = done.has(today)

  // Count back from today if it's done, otherwise from yesterday: today isn't over yet
  let current = 0
  for (let d = todayCounts ? today : previousDay(today); done.has(d); d = previousDay(d)) current++

  let best = 0
  for (const d of done) {
    if (done.has(previousDay(d))) continue // only start counting at the first day of a run
    let run = 0
    for (let x = d; done.has(x); x = new Date(Date.parse(`${x}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10)) run++
    best = Math.max(best, run)
  }

  return { current, best: Math.max(best, current), todayCounts }
}
