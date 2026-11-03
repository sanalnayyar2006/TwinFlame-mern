import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { authService } from '../services/auth.service'
import type { CurrentUser } from '../types/user'

// Mood lives on the user object (one source of truth). Changes show immediately and are
// rolled back if the server rejects them.
export function useMood(user: CurrentUser | null, setUser: Dispatch<SetStateAction<CurrentUser | null>>) {
  const myMood = user?.mood ?? null
  const partnerMood = user?.partnerId?.mood ?? null

  const select = useCallback(async (mood: string) => {
    const previous = myMood
    const next = previous === mood ? null : mood
    setUser(u => (u ? { ...u, mood: next } : u))
    try {
      await authService.setMood(next)
    } catch {
      setUser(u => (u ? { ...u, mood: previous } : u))
    }
  }, [myMood, setUser])

  // Real-time update from the partner's device
  const applyPartnerMood = useCallback((mood: string | null) => {
    setUser(u => (u?.partnerId ? { ...u, partnerId: { ...u.partnerId, mood } } : u))
  }, [setUser])

  return { myMood, partnerMood, select, applyPartnerMood }
}
