import { useCallback, useEffect, useState } from 'react'
import { authService } from '../services/auth.service'
import { journalService } from '../services/journal.service'
import { galleryService } from '../services/gallery.service'
import type { CurrentUser } from '../types/user'
import type { JournalEntry } from '../types/journal'
import type { GalleryImage } from '../types/gallery'

export interface ActivityItem {
  type: 'journal' | 'photo'
  text: string
  date: string
}

// Everything the dashboard shows apart from the Daily Connection card.
// Only the two newest journal entries and photos are fetched; counts come from the server's totals.
export function useDashboardData() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [recentJournal, setRecentJournal] = useState<JournalEntry | null>(null)
  const [recentPhoto, setRecentPhoto] = useState<GalleryImage | null>(null)
  const [counts, setCounts] = useState({ journals: 0, photos: 0 })
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const [me, journals, photos] = await Promise.all([
        authService.me(),
        journalService.list(undefined, 2).catch(() => null),
        galleryService.list(undefined, 2).catch(() => null)
      ])
      setUser(me)
      setRecentJournal(journals?.items[0] ?? null)
      setRecentPhoto(photos?.items[0] ?? null)
      setCounts({ journals: journals?.total ?? 0, photos: photos?.total ?? 0 })
      // Rebuilt each time so reloads never duplicate items
      setActivity([
        ...(journals?.items ?? []).map(e => ({ type: 'journal' as const, text: `New journal: ${e.title}`, date: e.createdAt })),
        ...(photos?.items ?? []).map(img => ({ type: 'photo' as const, text: img.caption || 'New photo added', date: img.createdAt }))
      ].sort((x, y) => y.date.localeCompare(x.date)))
    } catch (err) {
      // The service gives a plain reason, e.g. "Couldn't reach TwinFlame..." when offline
      setError((err as Error).message || 'Unable to load your dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      setUser(await authService.me())
    } catch {
      // keep showing what we have
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Live updates come over the socket; this only catches up after the tab was in the background
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshUser()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshUser])

  return { user, setUser, recentJournal, recentPhoto, counts, activity, loading, error, reload: load }
}
