import { describe, it, expect, vi } from 'vitest'

// setup.ts mocks this module; these tests need the real parser
vi.unmock('../../src/config/cloudinary')
const { journalImageIds, journalFolder } = await import('../../src/config/cloudinary')

const couple = 'aaa_bbb'
const img = (path: string) => `<img src="https://res.cloudinary.com/demo/image/upload/${path}">`

describe('journalImageIds', () => {
  it("finds this couple's photos, with or without a version or transform", () => {
    expect(journalImageIds(img(`v1700000000/twinflame/journal/${couple}/abc.jpg`), couple)).toEqual([`twinflame/journal/${couple}/abc`])
    expect(journalImageIds(img(`w_400,c_fill/v17/twinflame/journal/${couple}/x.png`), couple)).toEqual([`twinflame/journal/${couple}/x`])
  })

  it.each([
    ["another couple's photo", img('v1/twinflame/journal/zzz_yyy/abc.jpg')],
    ['a gallery photo', img('v1/twinflame/abc.jpg')],
    ['a non-Cloudinary host', `<img src="https://evil.example/twinflame/journal/${couple}/a.jpg">`],
    ['a base64 photo', '<img src="data:image/png;base64,AAAA">']
  ])('never returns %s, so cleanup cannot delete it', (_name, html) => {
    expect(journalImageIds(html, couple)).toEqual([])
  })

  it('collapses duplicates', () => {
    const one = img(`v1/twinflame/journal/${couple}/a.jpg`)
    expect(journalImageIds(one + one, couple)).toEqual([`twinflame/journal/${couple}/a`])
  })

  it('puts each couple in its own folder', () => {
    expect(journalFolder(couple)).toBe(`twinflame/journal/${couple}`)
  })
})
