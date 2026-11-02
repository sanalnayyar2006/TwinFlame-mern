// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useJournalDraft } from './useJournalDraft'

// A JWT-shaped token whose payload is { id }
const tokenFor = (id: string) => `h.${btoa(JSON.stringify({ id })).replace(/=+$/, '')}.s`

beforeEach(() => localStorage.clear())

describe('useJournalDraft', () => {
  it('saves, reads, and clears a draft', () => {
    localStorage.setItem('token', tokenFor('u1'))
    const { result } = renderHook(() => useJournalDraft())
    expect(result.current.hasDraft).toBe(false)
    act(() => result.current.save('Title', '<p>Body</p>'))
    expect(result.current.hasDraft).toBe(true)
    expect(result.current.read()).toEqual({ title: 'Title', content: '<p>Body</p>' })
    act(() => result.current.clear())
    expect(result.current.read()).toBeNull()
  })

  it('keeps the draft across sign-ins (new token, same user)', () => {
    localStorage.setItem('token', tokenFor('u1'))
    renderHook(() => useJournalDraft()).result.current.save('Kept', 'x')
    localStorage.setItem('token', tokenFor('u1') + 'different-signature')
    expect(renderHook(() => useJournalDraft()).result.current.read()?.title).toBe('Kept')
  })

  it("never shows another user's draft", () => {
    localStorage.setItem('token', tokenFor('u1'))
    renderHook(() => useJournalDraft()).result.current.save('Mine', 'x')
    localStorage.setItem('token', tokenFor('u2'))
    expect(renderHook(() => useJournalDraft()).result.current.hasDraft).toBe(false)
  })

  it('carries over a draft saved under the old token-based key', () => {
    const token = tokenFor('u1')
    localStorage.setItem('token', token)
    localStorage.setItem(`journalDraft_${token}`, JSON.stringify({ title: 'Old', content: 'y' }))
    const { result } = renderHook(() => useJournalDraft())
    expect(result.current.read()).toEqual({ title: 'Old', content: 'y' })
    expect(localStorage.getItem(`journalDraft_${token}`)).toBeNull()
  })

  it('does not save an empty draft', () => {
    localStorage.setItem('token', tokenFor('u1'))
    const { result } = renderHook(() => useJournalDraft())
    act(() => result.current.save('  ', ''))
    expect(result.current.hasDraft).toBe(false)
  })
})
