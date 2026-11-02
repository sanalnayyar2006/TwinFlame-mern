// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor, render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { usePaginatedList } from './usePaginatedList'
import { LoadMore } from '../components/LoadMore'
import type { Page } from '../types/page'

afterEach(cleanup)

type Item = { id: number }
const fetcher = () => vi.fn<(before?: string) => Promise<Page<Item>>>()
const page = (ids: number[], nextCursor: string | null, total = 5): Page<Item> =>
  ({ items: ids.map(id => ({ id })), nextCursor, total })

describe('usePaginatedList', () => {
  it('loads the first page, then appends the next', async () => {
    const fetchPage = fetcher()
      .mockResolvedValueOnce(page([5, 4, 3], 'c3'))
      .mockResolvedValueOnce(page([2, 1], null))
    const { result } = renderHook(() => usePaginatedList(fetchPage))
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.items.map(i => i.id)).toEqual([5, 4, 3])
    expect(result.current.hasMore).toBe(true)
    expect(result.current.total).toBe(5)

    await act(() => result.current.loadMore())
    expect(fetchPage).toHaveBeenLastCalledWith('c3')
    expect(result.current.items.map(i => i.id)).toEqual([5, 4, 3, 2, 1])
    expect(result.current.hasMore).toBe(false)
  })

  it('reports a first-page error and recovers on reload', async () => {
    const fetchPage = fetcher()
      .mockRejectedValueOnce(new Error('Server error'))
      .mockResolvedValueOnce(page([1], null, 1))
    const { result } = renderHook(() => usePaginatedList(fetchPage))
    await waitFor(() => expect(result.current.error).toBe('Server error'))
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(result.current.error).toBeNull()
  })

  it('keeps loaded items when the next page fails', async () => {
    const fetchPage = fetcher()
      .mockResolvedValueOnce(page([3, 2], 'c2', 3))
      .mockRejectedValueOnce(new Error('Offline'))
    const { result } = renderHook(() => usePaginatedList(fetchPage))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(() => result.current.loadMore())
    expect(result.current.items).toHaveLength(2)
    expect(result.current.loadMoreError).toBe('Offline')
    expect(result.current.hasMore).toBe(true)
  })

  it('ignores a second loadMore while one is in flight', async () => {
    let resolve!: (p: Page<Item>) => void
    const fetchPage = fetcher()
      .mockResolvedValueOnce(page([3], 'c3', 3))
      .mockImplementationOnce(() => new Promise(r => { resolve = r }))
    const { result } = renderHook(() => usePaginatedList(fetchPage))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { void result.current.loadMore(); void result.current.loadMore() })
    await act(async () => resolve(page([2, 1], null, 3)))
    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(result.current.items.map(i => i.id)).toEqual([3, 2, 1])
  })
})

describe('LoadMore', () => {
  it('shows progress and a working button while more pages exist', async () => {
    const onLoadMore = vi.fn()
    render(<LoadMore hasMore loading={false} error={null} onLoadMore={onLoadMore} shown={20} total={25} noun="entries" />)
    expect(screen.getByText('Showing 20 of 25 entries')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }))
    expect(onLoadMore).toHaveBeenCalled()
  })

  it('offers a retry after an error', () => {
    render(<LoadMore hasMore loading={false} error="Offline" onLoadMore={vi.fn()} shown={20} total={25} noun="entries" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Offline')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled()
  })

  it('renders nothing on the last page', () => {
    const { container } = render(<LoadMore hasMore={false} loading={false} error={null} onLoadMore={vi.fn()} shown={5} total={5} noun="entries" />)
    expect(container).toBeEmptyDOMElement()
  })
})
