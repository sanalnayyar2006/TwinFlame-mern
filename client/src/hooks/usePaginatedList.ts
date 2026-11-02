import { useCallback, useEffect, useRef, useState } from 'react'
import type { Page } from '../types/page'

// Cursor-paged list: first page on mount, loadMore() for the next, reload() to start over.
// setItems/setTotal let pages apply local changes (new entry, delete) without refetching.
export function usePaginatedList<T>(fetchPage: (before?: string) => Promise<Page<T>>) {
  const [items, setItems] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const fetchRef = useRef(fetchPage)
  const busy = useRef(false)

  useEffect(() => {
    fetchRef.current = fetchPage
  })

  const fetchFirst = useCallback(async () => {
    try {
      const page = await fetchRef.current()
      setItems(page.items)
      setTotal(page.total)
      setCursor(page.nextCursor)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchFirst()
  }, [fetchFirst])

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    void fetchFirst()
  }, [fetchFirst])

  const loadMore = useCallback(async () => {
    if (!cursor || busy.current) return
    busy.current = true
    setLoadingMore(true)
    setLoadMoreError(null)
    try {
      const page = await fetchRef.current(cursor)
      setItems(prev => [...prev, ...page.items])
      setTotal(page.total)
      setCursor(page.nextCursor)
    } catch (err) {
      setLoadMoreError((err as Error).message)
    } finally {
      busy.current = false
      setLoadingMore(false)
    }
  }, [cursor])

  return {
    items, setItems, total, setTotal,
    loading, loadingMore, error, loadMoreError,
    hasMore: cursor !== null,
    loadMore, reload
  }
}
