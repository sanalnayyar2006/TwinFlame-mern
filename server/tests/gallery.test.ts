import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { useTestApp, registerCouple, registerUser, auth } from './helpers'

const ctx = useTestApp()
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const upload = (token: string, caption = '') =>
  request(ctx.app).post('/api/gallery').set(auth(token)).field('caption', caption).attach('image', png, 'p.png')

describe('gallery', () => {
  it('uploads, lists with a total, and is shared with the partner', async () => {
    const { a, b } = await registerCouple(ctx.app)
    const res = await upload(a.token, 'Beach')
    expect(res.status).toBe(201)
    expect(res.body.caption).toBe('Beach')
    const list = await request(ctx.app).get('/api/gallery').set(auth(b.token))
    expect(list.body.total).toBe(1)
    expect(list.body.images[0].caption).toBe('Beach')
  })

  it('needs a linked couple', async () => {
    const solo = await registerUser(ctx.app, 'Solo')
    expect((await upload(solo.token)).status).toBe(401)
  })

  it('rejects non-images and files over 10 MB with clear messages', async () => {
    const { a } = await registerCouple(ctx.app)
    const txt = await request(ctx.app).post('/api/gallery').set(auth(a.token)).attach('image', Buffer.from('#!/bin/sh'), { filename: 'x.sh', contentType: 'text/x-sh' })
    expect(txt.status).toBe(400)
    expect(txt.body.message).toMatch(/Only image files/)
    const big = await request(ctx.app).post('/api/gallery').set(auth(a.token)).attach('image', Buffer.alloc(11 * 1024 * 1024), { filename: 'big.png', contentType: 'image/png' })
    expect(big.status).toBe(413)
    expect(big.body.message).toBe('Photo must be 10 MB or smaller.')
  })

  it('validates caption length', async () => {
    const { a } = await registerCouple(ctx.app)
    expect((await upload(a.token, 'x'.repeat(501))).status).toBe(400)
  })

  it('only the uploader can delete; captions can be edited', async () => {
    const { a, b } = await registerCouple(ctx.app)
    const id = (await upload(a.token)).body._id
    expect((await request(ctx.app).patch(`/api/gallery/${id}`).set(auth(a.token)).send({ caption: 'New' })).body.caption).toBe('New')
    expect((await request(ctx.app).delete(`/api/gallery/${id}`).set(auth(b.token))).status).toBe(403)
    expect((await request(ctx.app).delete(`/api/gallery/${id}`).set(auth(a.token))).status).toBe(200)
  })

  it('pages with a cursor', async () => {
    const { a } = await registerCouple(ctx.app)
    for (let i = 0; i < 3; i++) await upload(a.token, `p${i}`)
    const p1 = await request(ctx.app).get('/api/gallery?limit=2').set(auth(a.token))
    expect(p1.body.images.map((x: { caption: string }) => x.caption)).toEqual(['p2', 'p1'])
    const p2 = await request(ctx.app).get(`/api/gallery?limit=2&before=${p1.body.nextCursor}`).set(auth(a.token))
    expect(p2.body.images.map((x: { caption: string }) => x.caption)).toEqual(['p0'])
    expect(p2.body.nextCursor).toBeNull()
  })
})
