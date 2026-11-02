import { afterAll, beforeAll, inject } from 'vitest'
import mongoose from 'mongoose'
import request from 'supertest'
import type { AddressInfo } from 'net'
import { createServer } from '../src/app'

export interface TestUser {
  token: string
  id: string
  name: string
  email: string
  coupleCode: string
}

// Fresh app and database per test file. Call at the top level of the file.
export function useTestApp(opts: { listen?: boolean } = {}) {
  const ctx = {} as { app: ReturnType<typeof createServer>['app']; io: ReturnType<typeof createServer>['io']; baseUrl: string }

  beforeAll(async () => {
    const dbName = `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    await mongoose.connect(inject('mongoUri'), { dbName })
    await mongoose.connection.syncIndexes()
    const { app, server, io } = createServer()
    ctx.app = app
    ctx.io = io
    if (opts.listen) {
      await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
      ctx.baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    }
  })

  afterAll(async () => {
    ctx.io?.close()
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  })

  return ctx
}

let counter = 0
export async function registerUser(app: Parameters<typeof request>[0], name = 'User'): Promise<TestUser> {
  const email = `${name.toLowerCase()}${Date.now()}${++counter}@test.dev`
  const res = await request(app).post('/api/auth/register').send({ name, email, password: 'secret123' })
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`)
  return { token: res.body.token, id: String(res.body.user.id), name, email, coupleCode: res.body.user.coupleCode }
}

export async function registerCouple(app: Parameters<typeof request>[0]) {
  const a = await registerUser(app, 'Ana')
  const b = await registerUser(app, 'Ben')
  const res = await request(app).post('/api/auth/link-partner').set('Authorization', `Bearer ${a.token}`).send({ partnerCode: b.coupleCode })
  if (res.status !== 200) throw new Error(`link failed: ${res.status} ${JSON.stringify(res.body)}`)
  return { a, b }
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` })
