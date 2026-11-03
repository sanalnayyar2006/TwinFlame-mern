import { useCallback, useState } from 'react'

export interface JournalDraft {
  title: string
  content: string
}

// Reads the user id from the JWT payload. Only used as a storage key, never trusted for access.
const userIdFromToken = (token: string | null): string | null => {
  try {
    const payload = JSON.parse(atob((token ?? '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.id === 'string' ? payload.id : null
  } catch {
    return null
  }
}

// Drafts used to be keyed by the whole token, which changes on every sign-in, so they were
// lost after logging out and back in. Key by user id, and carry over a draft from the old key.
const draftKey = () => {
  const token = localStorage.getItem('token')
  const key = `journalDraft_user_${userIdFromToken(token) ?? 'anon'}`
  const legacy = `journalDraft_${token || 'anon'}`
  const old = localStorage.getItem(legacy)
  if (old && !localStorage.getItem(key)) localStorage.setItem(key, old)
  if (old) localStorage.removeItem(legacy)
  return key
}

const readDraft = (key: string): JournalDraft | null => {
  try {
    const d = JSON.parse(localStorage.getItem(key) ?? 'null')
    return d && typeof d === 'object' ? { title: String(d.title ?? ''), content: String(d.content ?? '') } : null
  } catch {
    return null
  }
}

// One unsent journal draft per user, kept on this device
export function useJournalDraft() {
  const [key] = useState(draftKey)
  const [hasDraft, setHasDraft] = useState(() => readDraft(key) !== null)

  const read = useCallback(() => readDraft(key), [key])

  const save = useCallback((title: string, content: string) => {
    if (!title.trim() && !content.trim()) return
    localStorage.setItem(key, JSON.stringify({ title, content }))
    setHasDraft(true)
  }, [key])

  const clear = useCallback(() => {
    localStorage.removeItem(key)
    setHasDraft(false)
  }, [key])

  return { hasDraft, read, save, clear }
}
