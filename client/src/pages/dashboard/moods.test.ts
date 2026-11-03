import { describe, it, expect } from 'vitest'
import { describeMood, isCustomMood } from './moods'

describe('moods', () => {
  it('describes presets and custom moods', () => {
    expect(describeMood('Calm')).toEqual({ label: 'Calm', color: '#60a5fa' })
    expect(describeMood('Hopeful||#10b981')).toEqual({ label: 'Hopeful', color: '#10b981' })
  })

  it('detects custom moods', () => {
    expect(isCustomMood('Hopeful||#10b981')).toBe(true)
    expect(isCustomMood('Calm')).toBe(false)
    expect(isCustomMood(null)).toBe(false)
  })
})
