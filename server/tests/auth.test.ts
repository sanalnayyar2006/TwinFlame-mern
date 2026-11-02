import { describe, it, expect, vi, afterEach } from 'vitest'
import request from 'supertest'
import { useTestApp, registerUser, auth } from './helpers'

const ctx = useTestApp()
afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.ALLOW_MOCK_GOOGLE
  delete process.env.GOOGLE_CLIENT_ID
})

describe('register', () => {
  it('creates an account with a readable couple code and a JWT', async () => {
    const res = await request(ctx.app).post('/api/auth/register').send({ name: 'Rae', email: 'Rae@Test.dev', password: 'secret123' })
    expect(res.status).toBe(201)
    expect(res.body.token.split('.')).toHaveLength(3)
    expect(res.body.user.coupleCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
    expect(res.headers['set-cookie']?.[0]).toMatch(/^token=.+HttpOnly/i)
  })

  it.each([
    [{ email: 'a@b.dev', password: 'secret123' }, 'Name is required'],
    [{ name: 'A', email: 'not-an-email', password: 'secret123' }, 'Enter a valid email address'],
    [{ name: 'A', email: 'a2@b.dev', password: '123' }, 'Password must be at least 6 characters']
  ])('rejects %j', async (body, message) => {
    const res = await request(ctx.app).post('/api/auth/register').send(body)
    expect(res.status).toBe(400)
    expect(res.body.message).toBe(message)
  })

  it('rejects a duplicate email regardless of case', async () => {
    const u = await registerUser(ctx.app, 'Dup')
    const res = await request(ctx.app).post('/api/auth/register').send({ name: 'Dup', email: u.email.toUpperCase(), password: 'secret123' })
    expect(res.status).toBe(400)
  })
})

describe('login', () => {
  it('signs in with a case-insensitive email', async () => {
    const u = await registerUser(ctx.app, 'Lia')
    const res = await request(ctx.app).post('/api/auth/login').send({ email: u.email.toUpperCase(), password: 'secret123' })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
  })

  it('rejects a wrong password', async () => {
    const u = await registerUser(ctx.app, 'Wes')
    expect((await request(ctx.app).post('/api/auth/login').send({ email: u.email, password: 'nope' })).status).toBe(401)
  })

  it('blocks NoSQL operator injection in the email field', async () => {
    await registerUser(ctx.app, 'Victim')
    const res = await request(ctx.app).post('/api/auth/login').send({ email: { $gt: '' }, password: 'secret123' })
    expect(res.status).toBe(400)
  })
})

describe('session', () => {
  it('/auth/me requires a valid token', async () => {
    expect((await request(ctx.app).get('/api/auth/me')).status).toBe(401)
    expect((await request(ctx.app).get('/api/auth/me').set(auth('garbage'))).status).toBe(401)
    const u = await registerUser(ctx.app, 'Me')
    const res = await request(ctx.app).get('/api/auth/me').set(auth(u.token))
    expect(res.status).toBe(200)
    expect(res.body.user.password).toBeUndefined()
  })

  it('logout expires the cookie', async () => {
    const res = await request(ctx.app).post('/api/auth/logout')
    expect(res.status).toBe(200)
    expect(res.headers['set-cookie']?.[0]).toMatch(/^token=;.*Expires=Thu, 01 Jan 1970/i)
  })

  it('the cookie alone authenticates until logout', async () => {
    const agent = request.agent(ctx.app)
    const email = `cookie${Date.now()}@test.dev`
    await agent.post('/api/auth/register').send({ name: 'Coo', email, password: 'secret123' })
    expect((await agent.get('/api/auth/me')).status).toBe(200)
    await agent.post('/api/auth/logout')
    expect((await agent.get('/api/auth/me')).status).toBe(401)
  })
})

describe('google sign-in', () => {
  const googleReplies = (payload: object, ok = true) =>
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => payload })))

  it('ignores dev_mock_ tokens unless ALLOW_MOCK_GOOGLE=true', async () => {
    googleReplies({}, false)
    const off = await request(ctx.app).post('/api/auth/google').send({ credential: 'dev_mock_x@test.dev:X' })
    expect(off.status).toBe(401)

    process.env.ALLOW_MOCK_GOOGLE = 'true'
    const on = await request(ctx.app).post('/api/auth/google').send({ credential: 'dev_mock_mock@test.dev:Mo' })
    expect(on.status).toBe(200)
    expect(on.body.user.isNewUser).toBe(true)
  })

  it('accepts a verified Google token issued for this app', async () => {
    process.env.GOOGLE_CLIENT_ID = 'ours.apps.googleusercontent.com'
    googleReplies({ iss: 'https://accounts.google.com', aud: 'ours.apps.googleusercontent.com', email: 'g@test.dev', name: 'G', email_verified: 'true' })
    const res = await request(ctx.app).post('/api/auth/google').send({ credential: 'real-looking-token' })
    expect(res.status).toBe(200)
  })

  it.each([
    ['another app (aud)', { iss: 'https://accounts.google.com', aud: 'someone-else', email: 'h@test.dev', email_verified: true }],
    ['a non-Google issuer', { iss: 'https://evil.example', aud: 'ours.apps.googleusercontent.com', email: 'i@test.dev', email_verified: true }]
  ])('rejects a token from %s', async (_n, payload) => {
    process.env.GOOGLE_CLIENT_ID = 'ours.apps.googleusercontent.com'
    googleReplies(payload)
    expect((await request(ctx.app).post('/api/auth/google').send({ credential: 't' })).status).toBe(401)
  })

  it('rejects an unverified Google email', async () => {
    googleReplies({ iss: 'accounts.google.com', email: 'u@test.dev', email_verified: false })
    expect((await request(ctx.app).post('/api/auth/google').send({ credential: 't' })).status).toBe(400)
  })
})
