import { vi } from 'vitest'

// Tests never read server/.env, so they can't touch real data or services
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET ??= 'test-secret-that-is-at-least-32-characters-long'
process.env.CLOUDINARY_CLOUD_NAME ??= 'test-cloud'
process.env.CLOUDINARY_API_KEY ??= 'test-key'
process.env.CLOUDINARY_API_SECRET ??= 'test-secret'
process.env.LOG_LEVEL ??= 'silent'

// No network uploads: return a realistic Cloudinary URL for whatever folder was asked for
vi.mock('../src/config/cloudinary', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/config/cloudinary')>()
  let n = 0
  return {
    ...actual,
    uploadBuffer: vi.fn(async (_buffer: Buffer, folder: string) => {
      const publicId = `${folder}/test${++n}`
      return { public_id: publicId, secure_url: `https://res.cloudinary.com/test-cloud/image/upload/v1/${publicId}.png` }
    }),
    destroyImages: vi.fn(async () => {}),
    default: { ...actual.default, uploader: { destroy: vi.fn(async () => ({ result: 'ok' })) } }
  }
})
