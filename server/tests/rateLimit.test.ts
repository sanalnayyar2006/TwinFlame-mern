import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { useTestApp, registerUser, auth } from './helpers'

// Off for every other suite (see config/security.ts); this file checks it actually works
process.env.RATE_LIMIT = 'on'
const ctx = useTestApp()

describe('rate limits', () => {
  it('blocks the 21st auth attempt in 15 minutes but never limits /auth/me', async () => {
    const u = await registerUser(ctx.app, 'Rl') // attempt 1
    const statuses: number[] = []
    for (let i = 0; i < 20; i++) {
      statuses.push((await request(ctx.app).post('/api/auth/login').send({ email: 'nobody@test.dev', password: 'x' })).status)
    }
    expect(statuses.slice(0, 19).every(s => s === 400 || s === 401)).toBe(true)
    expect(statuses[19]).toBe(429)
    const blocked = await request(ctx.app).post('/api/auth/login').send({ email: u.email, password: 'secret123' })
    expect(blocked.body.message).toBe('Too many attempts. Wait 15 minutes and try again.')
    expect(blocked.headers['ratelimit-policy'] ?? blocked.headers['ratelimit']).toBeTruthy()
    expect((await request(ctx.app).get('/api/auth/me').set(auth(u.token))).status).toBe(200)
  })
})
