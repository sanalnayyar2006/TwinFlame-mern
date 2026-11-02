import { describe, it, expect } from 'vitest'
import { registerSchema, loginSchema, linkPartnerSchema, moodSchema, journalCreateSchema } from '../../src/validation/schemas'

describe('request schemas', () => {
  it('normalises email and rejects objects (NoSQL operators)', () => {
    expect(loginSchema.parse({ email: '  ANA@Test.DEV ', password: 'x' }).email).toBe('ana@test.dev')
    expect(loginSchema.safeParse({ email: { $gt: '' }, password: 'x' }).success).toBe(false)
    expect(linkPartnerSchema.safeParse({ partnerCode: { $ne: null } }).success).toBe(false)
  })

  it('gives a readable message for missing fields', () => {
    const r = registerSchema.safeParse({ email: 'a@b.dev', password: 'secret123' })
    expect(r.success || r.error.issues[0].message).toBe('Name is required')
  })

  it('uppercases couple codes', () => {
    expect(linkPartnerSchema.parse({ partnerCode: ' ab2cd3 ' }).partnerCode).toBe('AB2CD3')
  })

  it.each([['Happy', true], ['Hopeful||#d4637f', true], [null, true], ['x||red', false], ['a'.repeat(30), false]])('mood %j -> %s', (mood, ok) => {
    expect(moodSchema.safeParse({ mood }).success).toBe(ok)
  })

  it('only allows image data URLs or https for journal images', () => {
    const base = { title: 't', content: 'c' }
    expect(journalCreateSchema.safeParse({ ...base, imageUrl: 'https://res.cloudinary.com/x.jpg' }).success).toBe(true)
    expect(journalCreateSchema.safeParse({ ...base, imageUrl: 'data:image/png;base64,AAAA' }).success).toBe(true)
    expect(journalCreateSchema.safeParse({ ...base, imageUrl: 'javascript:alert(1)' }).success).toBe(false)
    expect(journalCreateSchema.safeParse({ ...base, imageUrl: 'data:text/html,<script>' }).success).toBe(false)
  })
})
