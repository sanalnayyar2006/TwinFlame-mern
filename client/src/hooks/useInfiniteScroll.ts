import { useCallback, useEffect, useRef } from 'react'

// Returns a ref for a sentinel element; onReach runs when it scrolls within 400px of view.
// Pages should still render a visible "Load more" button for keyboard and screen reader users.
export function useInfiniteScroll(onReach: () => void, enabled: boolean) {
  const observer = useRef<IntersectionObserver | null>(null)
  const callback = useRef(onReach)

  useEffect(() => {
    callback.current = onReach
  })

  useEffect(() => () => observer.current?.disconnect(), [])

  return useCallback((node: HTMLElement | null) => {
    observer.current?.disconnect()
    if (!node || !enabled || typeof IntersectionObserver === 'undefined') return
    observer.current = new IntersectionObserver(
      entries => { if (entries[0]?.isIntersecting) callback.current() },
      { rootMargin: '400px' }
    )
    observer.current.observe(node)
  }, [enabled])
}
