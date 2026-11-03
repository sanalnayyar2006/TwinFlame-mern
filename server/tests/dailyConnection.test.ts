import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { useTestApp, registerCouple, registerUser, auth } from './helpers'
import User from '../src/models/User'
import DailyConnection from '../src/models/DailyConnection'

const ctx = useTestApp()
const tz = 'Asia/Kolkata'
const get = (t: string, zone = tz) => request(ctx.app).get(`/api/daily-connection?tz=${encodeURIComponent(zone)}`).set(auth(t))
const complete = (t: string, note?: string, zone = tz) => request(ctx.app).post('/api/daily-connection').set(auth(t)).send({ note, tz: zone })
const edit = (t: string, note: string) => request(ctx.app).patch('/api/daily-connection').set(auth(t)).send({ note, tz })

describe('daily connection', () => {
  it('gives both partners the same prompt and date', async () => {
    const { a, b } = await registerCouple(ctx.app)
    const [ra, rb] = [await get(a.token), await get(b.token)]
    expect(ra.body.prompt).toBe(rb.body.prompt)
    expect(ra.body.date).toBe(rb.body.date)
    expect(ra.body.sharedClock).toBe(false)
  })

  it('shares a trimmed note with the partner, and edits it', async () => {
    const { a, b } = await registerCouple(ctx.app)
    expect((await complete(a.token, '  Your laugh  ')).body.mine.note).toBe('Your laugh')
    expect((await get(b.token)).body.partner.note).toBe('Your laugh')
    await edit(a.token, 'Edited')
    const seen = (await get(b.token)).body.partner
    expect(seen.note).toBe('Edited')
    expect(seen.updatedAt).not.toBe(seen.completedAt)
  })

  it('completing twice keeps the first answer', async () => {
    const { a } = await registerCouple(ctx.app)
    await complete(a.token, 'first')
    expect((await complete(a.token, 'second')).body.mine.note).toBe('first')
  })

  it('validates notes and edit order', async () => {
    const { a } = await registerCouple(ctx.app)
    expect((await edit(a.token, 'x')).status).toBe(404)
    expect((await complete(a.token, 'x'.repeat(501))).status).toBe(400)
    expect((await complete(a.token)).body.mine.note).toBe('')
  })

  it('uses a shared UTC day when partners are in different zones', async () => {
    const { a, b } = await registerCouple(ctx.app)
    await get(a.token, 'Asia/Kolkata')
    const rb = await get(b.token, 'America/New_York')
    const ra = await get(a.token, 'Asia/Kolkata')
    expect(ra.body.sharedClock && rb.body.sharedClock).toBe(true)
    expect(ra.body.date).toBe(new Date().toISOString().slice(0, 10))
    expect(rb.body.date).toBe(ra.body.date)
  })

  it('works before a partner is linked', async () => {
    const solo = await registerUser(ctx.app, 'Solo')
    expect((await complete(solo.token, 'solo')).body.mine.note).toBe('solo')
    expect((await get(solo.token)).body.partner).toBeNull()
  })

  it('counts a day toward the streak only when both partners answered', async () => {
    const { a, b } = await registerCouple(ctx.app)
    expect((await get(a.token)).body.streak).toEqual({ current: 0, best: 0, todayCounts: false })
    expect((await complete(a.token, 'one')).body.streak.current).toBe(0)
    const after = (await complete(b.token)).body.streak
    expect(after).toEqual({ current: 1, best: 1, todayCounts: true })
    expect((await get(a.token)).body.streak.current).toBe(1)
  })

  it('includes earlier consecutive days', async () => {
    const { a, b } = await registerCouple(ctx.app)
    const today = (await get(a.token)).body.date as string
    const coupleId = (await User.findOne({ email: a.email }))!.coupleId
    const ids = (await User.find({ email: { $in: [a.email, b.email] } })).map(u => u._id)
    const back = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10)
    const both = ids.map(user => ({ user, note: '', completedAt: new Date(), updatedAt: new Date() }))
    await DailyConnection.insertMany([
      { coupleKey: coupleId, date: back(1), prompt: 'p', responses: both },
      { coupleKey: coupleId, date: back(2), prompt: 'p', responses: both },
      { coupleKey: coupleId, date: back(4), prompt: 'p', responses: both },
      // Only one partner answered three days ago: breaks the run
      { coupleKey: coupleId, date: back(3), prompt: 'p', responses: both.slice(0, 1) }
    ])
    // Today not done yet: yesterday's run of 2 is still alive
    expect((await get(a.token)).body.streak).toEqual({ current: 2, best: 2, todayCounts: false })
  })

  it("counts a solo user's own days", async () => {
    const solo = await registerUser(ctx.app, 'Solo')
    expect((await complete(solo.token)).body.streak.current).toBe(1)
  })
})
