import { useCallback, useEffect, useRef, useState } from 'react'
import { dailyConnectionService } from '../services/dailyConnection.service'
import type { DailyConnection, DailyConnectionUpdate } from '../types/dailyConnection'

export function useDailyConnection(myUserId: string | null) {
  const [data, setData] = useState<DailyConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const shownDate = useRef<string | null>(null)

  useEffect(() => {
    shownDate.current = data?.date ?? null
  }, [data])

  const fetchToday = useCallback(async () => {
    try {
      const today = await dailyConnectionService.getToday()
      setData(today)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    void fetchToday()
  }, [fetchToday])

  useEffect(() => {
    void fetchToday()
  }, [fetchToday])

  // Coming back to the tab after midnight should show the new day
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void fetchToday()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchToday])

  const save = useCallback(async (action: () => Promise<DailyConnection>) => {
    setSaving(true)
    setSaveError(null)
    try {
      setData(await action())
      return true
    } catch (err) {
      setSaveError((err as Error).message)
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  const complete = useCallback(
    (note: string) => save(() => dailyConnectionService.complete(note)),
    [save]
  )

  const updateNote = useCallback(
    (note: string) => save(() => dailyConnectionService.updateNote(note)),
    [save]
  )

  // Wire into useSocket's onDailyConnectionUpdate
  const handleRealtimeUpdate = useCallback((update: DailyConnectionUpdate) => {
    if (update.userId === myUserId) return
    if (shownDate.current !== update.date) {
      // Different day than we're showing: refetch rather than guess
      void fetchToday()
      return
    }
    setData(prev => (prev ? { ...prev, partner: update.response } : prev))
  }, [myUserId, fetchToday])

  return {
    data,
    loading,
    error,
    reload,
    saving,
    saveError,
    complete,
    updateNote,
    handleRealtimeUpdate
  }
}
