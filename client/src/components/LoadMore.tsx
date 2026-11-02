import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import styles from './LoadMore.module.css'

interface LoadMoreProps {
  hasMore: boolean
  loading: boolean
  error: string | null
  onLoadMore: () => void
  shown: number
  total: number
  noun: string
}

// Footer for paged lists: loads automatically near the bottom, with a real button as the fallback
export const LoadMore = ({ hasMore, loading, error, onLoadMore, shown, total, noun }: LoadMoreProps) => {
  const sentinel = useInfiniteScroll(onLoadMore, hasMore && !loading && !error)

  if (!hasMore) return null

  return (
    <div className={styles.wrap}>
      <div ref={sentinel} aria-hidden="true" />
      <p className={styles.count} aria-live="polite">
        Showing {shown} of {total} {noun}
      </p>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button type="button" className={styles.button} onClick={onLoadMore} disabled={loading}>
        {loading ? 'Loading…' : error ? 'Try again' : 'Load more'}
      </button>
    </div>
  )
}
