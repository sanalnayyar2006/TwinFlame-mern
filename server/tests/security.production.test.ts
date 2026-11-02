import { describe, it, expect, beforeAll, afterAll, inject } from 'vitest'
import mongoose from 'mongoose'
import request from 'supertest'
import type { AddressInfo } from 'net'
import type { Server } from 'http'

// Production rules are read at import time, so set the env first and import the app after
process.env.NODE_ENV = 'production'
process.env.CLIENT_URL = 'https://twinflame.example'
process.env.GOOGLE_CLIENT_ID = 'ours.apps.googleusercontent.com'

let app: import('express').Express
let server: Server
let base: string

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: `prod_${Date.now()}` })
  const created = (await import('../src/app')).createServer()
  app = created.app
  server = created.server
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(async () => {
  server.close()
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})

describe('CORS in production', () => {
  it.each([
    ['https://evil.onrender.com', false],
    ['https://twinflame.onrender.com.evil.example', false],
    ['https://twinflame.example.evil.example', false],
    ['https://twinflame.example', true]
  ])('%s allowed=%s', async (origin, allowed) => {
    const res = await request(app).get('/health').set('Origin', origin)
    if (allowed) {
      expect(res.status).toBe(200)
      expect(res.headers['access-control-allow-origin']).toBe(origin)
      expect(res.headers['access-control-allow-credentials']).toBe('true')
    } else {
      expect(res.status).toBe(403)
      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    }
  })

  it("allows the server's own origin (it also serves the client)", async () => {
    const res = await fetch(`${base}/health`, { headers: { Origin: base } })
    expect(res.status).toBe(200)
  })

  it('blocks preflight from other sites', async () => {
    const res = await request(app).options('/api/journal').set('Origin', 'https://evil.onrender.com').set('Access-Control-Request-Method', 'GET')
    expect(res.status).toBe(403)
  })

  it('applies the same rule to the Socket.IO handshake', async () => {
    const evil = await fetch(`${base}/socket.io/?EIO=4&transport=polling`, { headers: { Origin: 'https://evil.onrender.com' } })
    expect(evil.status).toBeGreaterThanOrEqual(400)
    const ok = await fetch(`${base}/socket.io/?EIO=4&transport=polling`, { headers: { Origin: 'https://twinflame.example' } })
    expect(ok.status).toBe(200)
  })
})

describe('headers and errors', () => {
  it('sends security headers and hides the framework', async () => {
    const res = await request(app).get('/health')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['content-security-policy-report-only']).toContain("frame-ancestors 'none'")
    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups')
    expect(res.headers['x-powered-by']).toBeUndefined()
  })

  it('returns JSON for unknown API routes and bad JSON', async () => {
    expect((await request(app).get('/api/nope')).body).toEqual({ message: 'API route not found' })
    const bad = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad')
    expect(bad.status).toBe(400)
    expect(bad.body.message).toBe('Invalid JSON in request body.')
  })

  it('never accepts mock Google tokens in production, even with the flag', async () => {
    process.env.ALLOW_MOCK_GOOGLE = 'true'
    const orig = globalThis.fetch
    globalThis.fetch = (async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch
    try {
      const res = await request(app).post('/api/auth/google').send({ credential: 'dev_mock_x@test.dev:X' })
      expect(res.status).toBe(401)
    } finally {
      globalThis.fetch = orig
      delete process.env.ALLOW_MOCK_GOOGLE
    }
  })
})
