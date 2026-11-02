import { describe, it, expect } from 'vitest'
import { resolveCoupleDay, isValidTimeZone } from '../../src/utils/dayKey'
import { promptForDate, DAILY_PROMPTS } from '../../src/config/dailyPrompts'

// 20:00 UTC on Nov 2 is 01:30 Nov 3 in India and 15:00 Nov 2 in New York
const now = new Date('2026-11-02T20:00:00Z')

describe('resolveCoupleDay', () => {
  it('uses the shared local day when partners are in the same zone', () => {
    expect(resolveCoupleDay('Asia/Kolkata', 'Asia/Kolkata', now)).toEqual({ date: '2026-11-03', sharedClock: false })
  })

  it('treats zones with the same offset as the same zone', () => {
    expect(resolveCoupleDay('Asia/Kolkata', 'Asia/Calcutta', now)).toEqual({ date: '2026-11-03', sharedClock: false })
  })

  it("uses the caller's day until the partner's zone is known", () => {
    expect(resolveCoupleDay('Asia/Kolkata', null, now)).toEqual({ date: '2026-11-03', sharedClock: false })
  })

  it('switches both partners to UTC when zones differ', () => {
    expect(resolveCoupleDay('Asia/Kolkata', 'America/New_York', now)).toEqual({ date: '2026-11-02', sharedClock: true })
    expect(resolveCoupleDay('America/New_York', 'Asia/Kolkata', now)).toEqual({ date: '2026-11-02', sharedClock: true })
  })

  it('falls back to UTC with no zone at all', () => {
    expect(resolveCoupleDay(null, null, now)).toEqual({ date: '2026-11-02', sharedClock: true })
  })
})

describe('isValidTimeZone', () => {
  it.each([['Europe/Berlin', true], ['Mars/Base', false], ['', false], [42, false]])('%s -> %s', (tz, ok) => {
    expect(isValidTimeZone(tz)).toBe(ok)
  })
})

describe('promptForDate', () => {
  it('is stable within a day and changes the next day', () => {
    expect(promptForDate('2026-11-02')).toBe(promptForDate('2026-11-02'))
    expect(promptForDate('2026-11-02')).not.toBe(promptForDate('2026-11-03'))
    expect(DAILY_PROMPTS).toContain(promptForDate('2026-11-02'))
  })
})
