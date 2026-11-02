// Cursor page returned by list endpoints: pass nextCursor back as ?before= for the next page
export interface Page<T> {
  items: T[]
  nextCursor: string | null
  total: number
}
