import { describe, it, expect, afterEach } from 'vitest'
import request from 'supertest'
import User from '../src/models/User'
import Journal from '../src/models/Journal'
import { useTestApp, registerCouple, auth } from './helpers'
import { DEMO_EMAILS } from '../src/demo/demoCouple'

const ctx = useTestApp()
afterEach(() => { delete process.env.DEMO_MODE })
const demo = (as: unknown) => request(ctx.app).post('/api/auth/demo').send({ as })

describe('demo couple', () => {
  it('does not exist unless DEMO_MODE=true', async () => {
    expect((await demo('ana')).status).toBe(404)
    expect(await User.countDocuments({ email: DEMO_EMAILS.ana })).toBe(0)
  })

  it('signs in as Ana or Ben, already linked, with sample journal entries', async () => {
    process.env.DEMO_MODE = 'true'
    const ana = await demo('ana')
    const ben = await demo('ben')
    expect(ana.status).toBe(200)
    expect(ben.status).toBe(200)
    const meA = (await request(ctx.app).get('/api/auth/me').set(auth(ana.body.token))).body.user
    const meB = (await request(ctx.app).get('/api/auth/me').set(auth(ben.body.token))).body.user
    expect(meA.partnerId.name).toBe('Ben')
    expect(meA.coupleId).toBe(meB.coupleId)
    const feed = await request(ctx.app).get('/api/journal').set(auth(ben.body.token))
    expect(feed.body.total).toBe(4)
    expect(feed.body.entries[0].title).toBe('Small thing')
    // Sample dates are spread over the past week, newest first
    expect(new Date(feed.body.entries[3].createdAt).getTime()).toBeLessThan(Date.now() - 5 * 86_400_000)
  })

  it('reuses the same couple while it is fresh', async () => {
    process.env.DEMO_MODE = 'true'
    const first = (await request(ctx.app).get('/api/auth/me').set(auth((await demo('ana')).body.token))).body.user._id
    const again = (await request(ctx.app).get('/api/auth/me').set(auth((await demo('ana')).body.token))).body.user._id
    expect(again).toBe(first)
  })

  it('resets after a day, wiping what visitors wrote, and never touches real users', async () => {
    process.env.DEMO_MODE = 'true'
    const real = await registerCouple(ctx.app)
    await request(ctx.app).post('/api/journal').set(auth(real.a.token)).send({ title: 'Real', content: 'mine' })
    const token = (await demo('ana')).body.token
    await request(ctx.app).post('/api/journal').set(auth(token)).send({ title: 'Visitor wrote this', content: 'x' })
    // Mongoose treats createdAt as immutable, so age it in the raw collection like real time would
    await User.collection.updateMany({ email: { $in: Object.values(DEMO_EMAILS) } }, { $set: { createdAt: new Date(Date.now() - 25 * 3600_000) } })

    const fresh = (await demo('ana')).body.token
    const titles = (await request(ctx.app).get('/api/journal').set(auth(fresh))).body.entries.map((e: { title: string }) => e.title)
    expect(titles).not.toContain('Visitor wrote this')
    expect(titles).toHaveLength(4)
    expect((await request(ctx.app).get('/api/auth/me').set(auth(token))).status).toBe(401)
    expect(await Journal.countDocuments({ title: 'Real' })).toBe(1)
    expect((await request(ctx.app).get('/api/auth/me').set(auth(real.a.token))).status).toBe(200)
  })

  it('handles several visitors arriving at once', async () => {
    process.env.DEMO_MODE = 'true'
    await User.deleteMany({ email: { $in: Object.values(DEMO_EMAILS) } })
    const results = await Promise.all([demo('ana'), demo('ben'), demo('ana'), demo('ben')])
    expect(results.every(r => r.status === 200)).toBe(true)
    expect(await User.countDocuments({ email: { $in: Object.values(DEMO_EMAILS) } })).toBe(2)
  })

  it('rejects anyone other than Ana or Ben', async () => {
    process.env.DEMO_MODE = 'true'
    expect((await demo('admin')).status).toBe(400)
    expect((await demo({ $ne: null })).status).toBe(400)
  })

  it('demo accounts cannot be signed into with a password', async () => {
    process.env.DEMO_MODE = 'true'
    await demo('ana')
    const res = await request(ctx.app).post('/api/auth/login').send({ email: DEMO_EMAILS.ana, password: 'secret123' })
    expect(res.status).toBe(401)
  })
})
