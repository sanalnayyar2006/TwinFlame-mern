import { describe, it, expect, afterEach } from 'vitest'
import request from 'supertest'
import { io as connect, type Socket } from 'socket.io-client'
import { useTestApp, registerUser, registerCouple, auth } from './helpers'

const ctx = useTestApp({ listen: true })
const open: Socket[] = []
afterEach(() => open.splice(0).forEach(s => s.disconnect()))

const socketFor = (token?: string) =>
  new Promise<Socket>((resolve, reject) => {
    const s = connect(ctx.baseUrl, { auth: token ? { token } : {}, transports: ['websocket'], reconnection: false })
    open.push(s)
    s.on('connect', () => resolve(s))
    s.on('connect_error', reject)
  })
const next = <T>(s: Socket, event: string) => new Promise<T>(resolve => s.once(event, resolve))

describe('socket auth', () => {
  it('rejects connections without a valid token', async () => {
    await expect(socketFor()).rejects.toThrow('Authentication required')
    await expect(socketFor('bad.token.here')).rejects.toThrow('Invalid token')
  })
})

describe('real-time events', () => {
  it('a newly linked partner gets partner-linked and then couple events on the same socket', async () => {
    const a = await registerUser(ctx.app, 'Ana'), b = await registerUser(ctx.app, 'Ben')
    const sb = await socketFor(b.token)
    const linked = next(sb, 'partner-linked')
    await request(ctx.app).post('/api/auth/link-partner').set(auth(a.token)).send({ partnerCode: b.coupleCode })
    await linked
    const mood = next<{ mood: string }>(sb, 'mood-updated')
    await request(ctx.app).patch('/api/auth/mood').set(auth(a.token)).send({ mood: 'Happy' })
    expect((await mood).mood).toBe('Happy')
  })

  it('a daily connection answer reaches the partner live', async () => {
    const { a, b } = await registerCouple(ctx.app)
    const sb = await socketFor(b.token)
    const update = next<{ userId: string; response: { note: string } }>(sb, 'daily-connection-updated')
    await request(ctx.app).post('/api/daily-connection').set(auth(a.token)).send({ note: 'live', tz: 'Asia/Kolkata' })
    const evt = await update
    expect(evt.userId).toBe(a.id)
    expect(evt.response.note).toBe('live')
  })

  it("events never reach another couple's sockets", async () => {
    const { a } = await registerCouple(ctx.app)
    const outsider = await registerCouple(ctx.app)
    const so = await socketFor(outsider.b.token)
    let leaked = false
    so.on('daily-connection-updated', () => { leaked = true })
    so.on('mood-updated', () => { leaked = true })
    await request(ctx.app).post('/api/daily-connection').set(auth(a.token)).send({ note: 'private', tz: 'Asia/Kolkata' })
    await request(ctx.app).patch('/api/auth/mood').set(auth(a.token)).send({ mood: 'Calm' })
    await new Promise(r => setTimeout(r, 300))
    expect(leaked).toBe(false)
  })
})
