import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { useTestApp, registerCouple, auth } from './helpers'
import { destroyImages, uploadBuffer } from '../src/config/cloudinary'

const ctx = useTestApp()
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
beforeEach(() => vi.mocked(destroyImages).mockClear())

const post = (token: string, body: object) => request(ctx.app).post('/api/journal').set(auth(token)).send(body)
const coupleIdOf = async (token: string) => (await request(ctx.app).get('/api/auth/me').set(auth(token))).body.user.coupleId

describe('journal entries', () => {
  it('both partners see the entry; other couples see nothing', async () => {
    const { a, b } = await registerCouple(ctx.app)
    const other = await registerCouple(ctx.app)
    expect((await post(a.token, { title: 'Walk', content: '<p>sunny</p>' })).status).toBe(201)
    expect((await request(ctx.app).get('/api/journal').set(auth(b.token))).body.entries[0].title).toBe('Walk')
    expect((await request(ctx.app).get('/api/journal').set(auth(other.a.token))).body.total).toBe(0)
  })

  it('strips scripts and handlers before saving, keeps formatting', async () => {
    const { a } = await registerCouple(ctx.app)
    const res = await post(a.token, { title: 'x', content: '<b>hi</b><img src=x onerror="steal()"><script>alert(1)</script>' })
    expect(res.status).toBe(201)
    expect(res.body.entry.content).toContain('<b>hi</b>')
    expect(res.body.entry.content).not.toMatch(/onerror|<script/)
  })

  it('rejects content that is empty after sanitizing, and bad image URLs', async () => {
    const { a } = await registerCouple(ctx.app)
    expect((await post(a.token, { title: 'x', content: '<script>alert(1)</script>' })).status).toBe(400)
    expect((await post(a.token, { title: 'x', content: 'ok', imageUrl: 'javascript:alert(1)' })).status).toBe(400)
    expect((await post(a.token, { content: 'no title' })).body.message).toBe('Title and content required')
  })

  it('pages newest first with a total', async () => {
    const { a } = await registerCouple(ctx.app)
    for (let i = 1; i <= 25; i++) await post(a.token, { title: `E${i}`, content: `c${i}` })
    const p1 = await request(ctx.app).get('/api/journal').set(auth(a.token))
    expect(p1.body.entries).toHaveLength(20)
    expect(p1.body.entries[0].title).toBe('E25')
    expect(p1.body.total).toBe(25)
    const p2 = await request(ctx.app).get(`/api/journal?before=${p1.body.nextCursor}`).set(auth(a.token))
    expect(p2.body.entries.map((e: { title: string }) => e.title)).toEqual(['E5', 'E4', 'E3', 'E2', 'E1'])
    expect(p2.body.nextCursor).toBeNull()
    expect((await request(ctx.app).get('/api/journal?before=bad').set(auth(a.token))).status).toBe(400)
  })

  it('only the author can edit or delete', async () => {
    const { a, b } = await registerCouple(ctx.app)
    const id = (await post(a.token, { title: 'Mine', content: 'c' })).body.entry._id
    expect((await request(ctx.app).patch(`/api/journal/${id}`).set(auth(b.token)).send({ content: 'hacked' })).status).toBe(403)
    expect((await request(ctx.app).delete(`/api/journal/${id}`).set(auth(b.token))).status).toBe(403)
    expect((await request(ctx.app).delete(`/api/journal/${id}`).set(auth(a.token))).status).toBe(200)
    expect((await request(ctx.app).get('/api/journal').set(auth(a.token))).body.total).toBe(0)
  })
})

describe('journal photos', () => {
  it("uploads into the couple's own folder", async () => {
    const { a } = await registerCouple(ctx.app)
    const res = await request(ctx.app).post('/api/journal/images').set(auth(a.token)).attach('image', png, 'p.png')
    expect(res.status).toBe(201)
    const coupleId = await coupleIdOf(a.token)
    expect(vi.mocked(uploadBuffer)).toHaveBeenLastCalledWith(expect.any(Buffer), `twinflame/journal/${coupleId}`)
    expect(res.body.url).toContain(`/twinflame/journal/${coupleId}/`)
  })

  it('rejects non-images', async () => {
    const { a } = await registerCouple(ctx.app)
    const res = await request(ctx.app).post('/api/journal/images').set(auth(a.token)).attach('image', Buffer.from('hi'), { filename: 'x.txt', contentType: 'text/plain' })
    expect(res.status).toBe(400)
  })

  it('deletes removed photos from storage, and all photos when the entry is deleted', async () => {
    const { a } = await registerCouple(ctx.app)
    const up = async () => (await request(ctx.app).post('/api/journal/images').set(auth(a.token)).attach('image', png, 'p.png')).body.url as string
    const [u1, u2] = [await up(), await up()]
    const id = (await post(a.token, { title: 'P', content: `<img src="${u1}"><img src="${u2}">` })).body.entry._id
    const coupleId = await coupleIdOf(a.token)
    const pid = (u: string) => u.match(/(twinflame\/journal\/.+)\.png$/)![1]

    await request(ctx.app).patch(`/api/journal/${id}`).set(auth(a.token)).send({ content: `<img src="${u2}">` })
    expect(vi.mocked(destroyImages)).toHaveBeenLastCalledWith([pid(u1)])
    expect(pid(u1).startsWith(`twinflame/journal/${coupleId}/`)).toBe(true)

    await request(ctx.app).delete(`/api/journal/${id}`).set(auth(a.token))
    expect(vi.mocked(destroyImages)).toHaveBeenLastCalledWith([pid(u2)])
  })

  it("never deletes another couple's photo pasted into an entry", async () => {
    const victim = await registerCouple(ctx.app)
    const victimUrl = (await request(ctx.app).post('/api/journal/images').set(auth(victim.a.token)).attach('image', png, 'p.png')).body.url
    const { a } = await registerCouple(ctx.app)
    const id = (await post(a.token, { title: 'x', content: `<img src="${victimUrl}">` })).body.entry._id
    await request(ctx.app).delete(`/api/journal/${id}`).set(auth(a.token))
    expect(vi.mocked(destroyImages)).toHaveBeenLastCalledWith([])
  })
})
