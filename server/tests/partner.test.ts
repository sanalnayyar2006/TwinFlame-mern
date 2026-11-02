import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { useTestApp, registerUser, registerCouple, auth } from './helpers'

const ctx = useTestApp()
const link = (token: string, partnerCode: unknown) =>
  request(ctx.app).post('/api/auth/link-partner').set(auth(token)).send({ partnerCode })
const me = async (token: string) => (await request(ctx.app).get('/api/auth/me').set(auth(token))).body.user

describe('link partner', () => {
  it('links two unlinked users into one couple', async () => {
    const a = await registerUser(ctx.app, 'Ana'), b = await registerUser(ctx.app, 'Ben')
    expect((await link(a.token, b.coupleCode.toLowerCase())).status).toBe(200)
    const [ma, mb] = [await me(a.token), await me(b.token)]
    expect(ma.coupleId).toBeTruthy()
    expect(ma.coupleId).toBe(mb.coupleId)
    expect(ma.partnerId._id).toBe(b.id)
  })

  it('cannot take over an existing couple', async () => {
    const { a, b } = await registerCouple(ctx.app)
    const before = await me(a.token)
    const attacker = await registerUser(ctx.app, 'Mal')
    const res = await link(attacker.token, a.coupleCode)
    expect(res.status).toBe(409)
    expect(res.body.message).toBe('This person is already linked with someone else.')
    const after = await me(a.token)
    expect(after.coupleId).toBe(before.coupleId)
    expect(after.partnerId._id).toBe(b.id)
  })

  it('blocks operator injection in the code', async () => {
    await registerCouple(ctx.app)
    const attacker = await registerUser(ctx.app, 'Inj')
    expect((await link(attacker.token, { $ne: null })).status).toBe(400)
    expect((await me(attacker.token)).partnerId).toBeNull()
  })

  it('rejects your own code, unknown codes, and relinking', async () => {
    const solo = await registerUser(ctx.app, 'Solo')
    expect((await link(solo.token, solo.coupleCode)).status).toBe(400)
    expect((await link(solo.token, 'ZZZZZZ')).status).toBe(404)
    const { a } = await registerCouple(ctx.app)
    const other = await registerUser(ctx.app, 'Oth')
    expect((await link(a.token, other.coupleCode)).status).toBe(409)
  })

  it('two people racing for the same partner: exactly one wins', async () => {
    const target = await registerUser(ctx.app, 'Tgt')
    const [x, y] = [await registerUser(ctx.app, 'X'), await registerUser(ctx.app, 'Y')]
    const results = await Promise.all([link(x.token, target.coupleCode), link(y.token, target.coupleCode)])
    expect(results.map(r => r.status).sort()).toEqual([200, 409])
    const t = await me(target.token)
    const winner = results[0].status === 200 ? x : y
    expect(t.partnerId._id).toBe(winner.id)
  })
})

describe('mood', () => {
  it('accepts presets and custom moods, rejects objects', async () => {
    const u = await registerUser(ctx.app, 'Moo')
    const set = (mood: unknown) => request(ctx.app).patch('/api/auth/mood').set(auth(u.token)).send({ mood })
    expect((await set('Happy')).status).toBe(200)
    expect((await set('Hopeful||#d4637f')).status).toBe(200)
    expect((await set({ $gt: '' })).status).toBe(400)
    expect((await me(u.token)).mood).toBe('Hopeful||#d4637f')
  })
})
