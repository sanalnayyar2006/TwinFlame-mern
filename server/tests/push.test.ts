import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import webpush from 'web-push'
import PushSubscription from '../src/models/PushSubscription'
import { useTestApp, registerCouple, registerUser, auth } from './helpers'

vi.mock('web-push', () => ({ default: { sendNotification: vi.fn(async () => ({ statusCode: 201 })) } }))
const send = vi.mocked(webpush.sendNotification)

const ctx = useTestApp()
const sub = (n: number) => ({ endpoint: `https://push.example.com/sub/${n}`, keys: { p256dh: 'BKey', auth: 'auth' } })
const subscribe = (token: string, body: object) => request(ctx.app).post('/api/push/subscribe').set(auth(token)).send(body)
const answer = (token: string, note = '') => request(ctx.app).post('/api/daily-connection').set(auth(token)).send({ note, tz: 'UTC' })

beforeEach(() => {
  process.env.VAPID_PUBLIC_KEY = 'test-public'
  process.env.VAPID_PRIVATE_KEY = 'test-private'
  send.mockClear()
})
afterEach(() => {
  delete process.env.VAPID_PUBLIC_KEY
  delete process.env.VAPID_PRIVATE_KEY
})

describe('push notifications', () => {
  it('reports when push is not configured, and refuses subscriptions', async () => {
    delete process.env.VAPID_PUBLIC_KEY
    const u = await registerUser(ctx.app, 'Np')
    expect((await request(ctx.app).get('/api/push/key').set(auth(u.token))).body).toEqual({ enabled: false, publicKey: null })
    expect((await subscribe(u.token, sub(1))).status).toBe(404)
  })

  it('gives the public key when configured', async () => {
    const u = await registerUser(ctx.app, 'Pk')
    expect((await request(ctx.app).get('/api/push/key').set(auth(u.token))).body).toEqual({ enabled: true, publicKey: 'test-public' })
  })

  it('validates subscriptions', async () => {
    const u = await registerUser(ctx.app, 'Val')
    expect((await subscribe(u.token, { endpoint: 'http://insecure.example', keys: sub(0).keys })).status).toBe(400)
    expect((await subscribe(u.token, { endpoint: 'https://push.example.com/x' })).status).toBe(400)
    expect((await subscribe(u.token, { endpoint: { $ne: null }, keys: sub(0).keys })).status).toBe(400)
  })

  it("tells the partner when you answer, without the note's text", async () => {
    const { a, b } = await registerCouple(ctx.app)
    await subscribe(b.token, sub(10))
    await subscribe(b.token, sub(11)) // second device
    await answer(a.token, 'a private note')
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2))
    const [target, payload] = send.mock.calls[0]
    expect((target as { endpoint: string }).endpoint).toMatch(/sub\/1[01]$/)
    const body = JSON.parse(payload as string)
    expect(body).toMatchObject({ title: "Ana answered today's question", url: '/dashboard' })
    expect(payload).not.toContain('a private note')
  })

  it('does not notify on a repeat answer or on edits, and never notifies yourself', async () => {
    const { a, b } = await registerCouple(ctx.app)
    await subscribe(a.token, sub(20))
    await subscribe(b.token, sub(21))
    await answer(a.token)
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    expect((send.mock.calls[0][0] as { endpoint: string }).endpoint).toBe(sub(21).endpoint)
    await answer(a.token)
    await request(ctx.app).patch('/api/daily-connection').set(auth(a.token)).send({ note: 'edit', tz: 'UTC' })
    await new Promise(r => setTimeout(r, 200))
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('removes subscriptions the push service says are gone', async () => {
    const { a, b } = await registerCouple(ctx.app)
    await subscribe(b.token, sub(30))
    send.mockRejectedValueOnce(Object.assign(new Error('gone'), { statusCode: 410 }))
    await answer(a.token)
    await vi.waitFor(async () => expect(await PushSubscription.countDocuments({ endpoint: sub(30).endpoint })).toBe(0))
  })

  it('a failing push service never fails the answer', async () => {
    const { a, b } = await registerCouple(ctx.app)
    await subscribe(b.token, sub(40))
    send.mockRejectedValueOnce(Object.assign(new Error('down'), { statusCode: 503 }))
    expect((await answer(a.token, 'still saved')).body.mine.note).toBe('still saved')
    expect(await PushSubscription.countDocuments({ endpoint: sub(40).endpoint })).toBe(1)
  })

  it('only the owner can remove a subscription; re-subscribing moves the device', async () => {
    const u1 = await registerUser(ctx.app, 'U1'), u2 = await registerUser(ctx.app, 'U2')
    await subscribe(u1.token, sub(50))
    await request(ctx.app).delete('/api/push/subscribe').set(auth(u2.token)).send({ endpoint: sub(50).endpoint })
    expect(await PushSubscription.countDocuments({ endpoint: sub(50).endpoint })).toBe(1)
    // Same browser, different account signs in and turns notifications on
    await subscribe(u2.token, sub(50))
    expect(await PushSubscription.countDocuments({ endpoint: sub(50).endpoint })).toBe(1)
    await request(ctx.app).delete('/api/push/subscribe').set(auth(u2.token)).send({ endpoint: sub(50).endpoint })
    expect(await PushSubscription.countDocuments({ endpoint: sub(50).endpoint })).toBe(0)
  })
})
