import { Types } from 'mongoose'

export const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

export interface PageQuery {
  limit: number
  // Return items created before this one; ObjectIds sort in creation order
  before?: Types.ObjectId
}

// ?limit=20&before=<id of the last item on the previous page>
export const parsePageQuery = (query: Record<string, unknown>): PageQuery | null => {
  const rawLimit = query.limit === undefined ? DEFAULT_PAGE_SIZE : Number(query.limit)
  if (!Number.isInteger(rawLimit) || rawLimit < 1) return null
  const limit = Math.min(rawLimit, MAX_PAGE_SIZE)

  if (query.before === undefined) return { limit }
  if (typeof query.before !== 'string' || !Types.ObjectId.isValid(query.before)) return null
  return { limit, before: new Types.ObjectId(query.before) }
}

// Fetch limit + 1 so we know whether another page exists without a second query
export const toPage = <T extends { _id: Types.ObjectId }>(docs: T[], limit: number) => {
  const items = docs.slice(0, limit)
  const nextCursor = docs.length > limit ? items[items.length - 1]._id.toString() : null
  return { items, nextCursor }
}
