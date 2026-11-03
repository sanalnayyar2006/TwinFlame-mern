// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'
import { DailyConnectionCard } from './DailyConnectionCard'
import type { DailyConnection } from '../../types/dailyConnection'

afterEach(cleanup)

const base: DailyConnection = {
  date: '2026-11-03',
  sharedClock: false,
  prompt: 'What is one thing you appreciate about your partner today?',
  mine: null,
  partner: null,
  streak: { current: 0, best: 0, todayCounts: false }
}

const response = (note: string, edited = false) => ({
  note,
  completedAt: '2026-11-03T14:00:00.000Z',
  updatedAt: edited ? '2026-11-03T15:00:00.000Z' : '2026-11-03T14:00:00.000Z'
})

const setup = (overrides: Partial<Parameters<typeof DailyConnectionCard>[0]> = {}) => {
  const props = {
    data: base,
    loading: false,
    error: null,
    onRetry: vi.fn(),
    saving: false,
    saveError: null,
    onComplete: vi.fn().mockResolvedValue(true),
    onUpdateNote: vi.fn().mockResolvedValue(true),
    partnerName: 'Priya',
    ...overrides
  }
  render(<MemoryRouter><DailyConnectionCard {...props} /></MemoryRouter>)
  return props
}

describe('DailyConnectionCard', () => {
  it('shows a loading state', () => {
    setup({ loading: true, data: null })
    expect(screen.getByText("Loading today's connection")).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows an error with a working retry', async () => {
    const props = setup({ error: 'Server error', data: null })
    expect(screen.getByRole('alert')).toHaveTextContent("Today's question didn't load. Server error")
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(props.onRetry).toHaveBeenCalledOnce()
  })

  it('completes with a trimmed optional note', async () => {
    const props = setup()
    expect(screen.getByText(base.prompt)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Add a note for Priya (optional)'), '  Your laugh  ')
    await userEvent.click(screen.getByRole('button', { name: 'Mark as done' }))
    expect(props.onComplete).toHaveBeenCalledWith('Your laugh')
  })

  it('completes without a note', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Mark as done' }))
    expect(props.onComplete).toHaveBeenCalledWith('')
  })

  it('blocks notes over 500 characters', async () => {
    setup()
    const field = screen.getByLabelText('Add a note for Priya (optional)')
    await userEvent.click(field)
    await userEvent.paste('x'.repeat(501))
    expect(screen.getByRole('button', { name: 'Mark as done' })).toBeDisabled()
    expect(field).toHaveAttribute('aria-invalid', 'true')
  })

  it('skip is local and can be undone', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Skip today' }))
    expect(screen.getByText(/Skipped for today/)).toBeInTheDocument()
    expect(props.onComplete).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Answer now' }))
    expect(screen.getByRole('button', { name: 'Mark as done' })).toBeInTheDocument()
  })

  it('shows my answer and lets me edit it', async () => {
    const props = setup({ data: { ...base, mine: response('Your laugh') } })
    expect(screen.getByText('Done today')).toBeInTheDocument()
    expect(screen.getByText('Your laugh')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Edit note' }))
    const field = screen.getByLabelText('Your note')
    expect(field).toHaveValue('Your laugh')
    await userEvent.clear(field)
    await userEvent.type(field, 'Edited')
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }))
    expect(props.onUpdateNote).toHaveBeenCalledWith('Edited')
  })

  it('offers to add a note when done without one', () => {
    setup({ data: { ...base, mine: response('') } })
    expect(screen.getByText('Marked as done, no note.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add a note' })).toBeInTheDocument()
  })

  it('shows a save error', () => {
    setup({ saveError: 'Note must be text up to 500 characters' })
    expect(screen.getByRole('alert')).toHaveTextContent('Note must be text up to 500 characters')
  })

  it('shows waiting while the partner has not answered', () => {
    setup()
    expect(screen.getByText(/Waiting for Priya/)).toBeInTheDocument()
  })

  it("shows the partner's note and edited marker", () => {
    setup({ data: { ...base, partner: response('Your patience', true) } })
    expect(screen.getByText('Your patience')).toBeInTheDocument()
    expect(screen.getByText(/edited/)).toBeInTheDocument()
    expect(screen.queryByText(/Waiting for/)).not.toBeInTheDocument()
  })

  it('asks to link a partner when there is none', () => {
    setup({ partnerName: null })
    expect(screen.getByRole('link', { name: 'Link your partner' })).toHaveAttribute('href', '/link-partner')
    expect(screen.getByLabelText('Add a note (optional)')).toBeInTheDocument()
  })

  it('explains the shared clock for different time zones', () => {
    setup({ data: { ...base, sharedClock: true } })
    expect(screen.getByText(/different time zones, so today follows UTC/)).toBeInTheDocument()
  })

  it('hides the streak until there is one', () => {
    setup()
    expect(screen.queryByLabelText(/day streak/)).not.toBeInTheDocument()
  })

  it('shows the streak and how to keep it going today', () => {
    setup({ data: { ...base, streak: { current: 3, best: 5, todayCounts: false } } })
    expect(screen.getByLabelText('3-day streak')).toHaveTextContent('3')
    expect(screen.getByText('When you both answer today, your streak grows to 4 days.')).toBeInTheDocument()
  })

  it('drops the hint once today counts', () => {
    setup({ data: { ...base, mine: response('x'), partner: response('y'), streak: { current: 4, best: 5, todayCounts: true } } })
    expect(screen.getByLabelText('4-day streak')).toBeInTheDocument()
    expect(screen.queryByText(/your streak grows/)).not.toBeInTheDocument()
  })

  describe('partner-answered notifications', () => {
    const push = (state: 'off' | 'on' | 'blocked') => ({ state, busy: false, error: null, onEnable: vi.fn(), onDisable: vi.fn() })

    it('offers to notify while waiting for the partner', async () => {
      const p = push('off')
      setup({ push: p })
      await userEvent.click(screen.getByRole('button', { name: 'Notify me when Priya answers' }))
      expect(p.onEnable).toHaveBeenCalledOnce()
    })

    it('shows when it is on, with a way to turn it off', async () => {
      const p = push('on')
      setup({ push: p })
      expect(screen.getByText(/You'll get a notification when Priya answers/)).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Turn off' }))
      expect(p.onDisable).toHaveBeenCalledOnce()
    })

    it('explains when the browser blocks it', () => {
      setup({ push: push('blocked') })
      expect(screen.getByText(/blocked for TwinFlame in your browser settings/)).toBeInTheDocument()
    })

    it('is hidden once the partner has answered, or when unavailable', () => {
      setup({ push: push('off'), data: { ...base, partner: response('hi') } })
      expect(screen.queryByRole('button', { name: /Notify me/ })).not.toBeInTheDocument()
      cleanup()
      setup()
      expect(screen.queryByRole('button', { name: /Notify me/ })).not.toBeInTheDocument()
    })
  })
})
