import { describe, it, expect } from 'vitest'
import { computeStreak } from '../../src/utils/streak'

const today = '2026-11-03'

describe('computeStreak', () => {
  it('is zero with no history', () => {
    expect(computeStreak([], today)).toEqual({ current: 0, best: 0, todayCounts: false })
  })

  it('counts today and the days before it', () => {
    expect(computeStreak(['2026-11-01', '2026-11-02', '2026-11-03'], today)).toEqual({ current: 3, best: 3, todayCounts: true })
  })

  it("keeps yesterday's streak alive while today is not done yet", () => {
    expect(computeStreak(['2026-11-01', '2026-11-02'], today)).toEqual({ current: 2, best: 2, todayCounts: false })
  })

  it('breaks after a missed day but remembers the best run', () => {
    const days = ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-11-02', '2026-11-03']
    expect(computeStreak(days, today)).toEqual({ current: 2, best: 4, todayCounts: true })
  })

  it('is zero once yesterday was missed', () => {
    expect(computeStreak(['2026-10-30', '2026-10-31'], today).current).toBe(0)
  })

  it('handles month and year boundaries', () => {
    expect(computeStreak(['2025-12-31', '2026-01-01'], '2026-01-01').current).toBe(2)
    expect(computeStreak(['2026-02-28', '2026-03-01'], '2026-03-01').current).toBe(2)
  })

  it('ignores duplicates', () => {
    expect(computeStreak(['2026-11-03', '2026-11-03'], today).current).toBe(1)
  })
})
