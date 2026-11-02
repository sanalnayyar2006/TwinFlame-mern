// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { SignOutControl } from './SignOutControl'

afterEach(cleanup)

describe('SignOutControl', () => {
  it('asks before signing out and focuses Cancel', async () => {
    const onConfirm = vi.fn()
    render(<SignOutControl onConfirm={onConfirm} busy={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole('group', { name: 'Sign out of TwinFlame on this device?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('signs out only after confirming', async () => {
    const onConfirm = vi.fn()
    render(<SignOutControl onConfirm={onConfirm} busy={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('cancel goes back without signing out', async () => {
    const onConfirm = vi.fn()
    render(<SignOutControl onConfirm={onConfirm} busy={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('a double tap on Sign out does not confirm', async () => {
    const onConfirm = vi.fn()
    render(<SignOutControl onConfirm={onConfirm} busy={false} />)
    await userEvent.dblClick(screen.getByRole('button', { name: 'Sign out' }))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('disables both buttons while signing out', async () => {
    const { rerender } = render(<SignOutControl onConfirm={vi.fn()} busy={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    rerender(<SignOutControl onConfirm={vi.fn()} busy />)
    expect(screen.getByRole('button', { name: 'Signing out…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})
