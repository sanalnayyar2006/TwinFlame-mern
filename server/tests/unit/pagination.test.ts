import { describe, it, expect } from 'vitest'
import { Types } from 'mongoose'
import { parsePageQuery, toPage } from '../../src/utils/pagination'

describe('parsePageQuery', () => {
  it('defaults to 20 and caps at 50', () => {
    expect(parsePageQuery({})).toEqual({ limit: 20 })
    expect(parsePageQuery({ limit: '500' })?.limit).toBe(50)
  })

  it.each([[{ limit: '-1' }], [{ limit: 'abc' }], [{ before: 'nope' }], [{ before: { $gt: '' } }]])('rejects %j', q => {
    expect(parsePageQuery(q)).toBeNull()
  })

  it('accepts an ObjectId cursor', () => {
    const id = new Types.ObjectId()
    expect(parsePageQuery({ before: id.toString() })?.before?.equals(id)).toBe(true)
  })
})

describe('toPage', () => {
  const docs = Array.from({ length: 3 }, () => ({ _id: new Types.ObjectId() }))
  it('sets a cursor only when there is another page', () => {
    expect(toPage(docs, 2).nextCursor).toBe(docs[1]._id.toString())
    expect(toPage(docs, 2).items).toHaveLength(2)
    expect(toPage(docs, 3).nextCursor).toBeNull()
  })
})
