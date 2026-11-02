// Starts the real server in production mode (serving client/dist) against an in-memory
// MongoDB, for the Playwright suite in /e2e. Never reads server/.env.
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

const PORT = Number(process.env.E2E_PORT ?? 4310)

Object.assign(process.env, {
  NODE_ENV: 'production',
  CLIENT_URL: `http://127.0.0.1:${PORT}`,
  GOOGLE_CLIENT_ID: 'e2e.apps.googleusercontent.com',
  JWT_SECRET: 'e2e-secret-that-is-at-least-32-characters',
  CLOUDINARY_CLOUD_NAME: 'e2e', CLOUDINARY_API_KEY: 'e2e', CLOUDINARY_API_SECRET: 'e2e',
  DEMO_MODE: 'true',
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'warn'
})

const main = async () => {
  const mongo = await MongoMemoryServer.create()
  await mongoose.connect(mongo.getUri(), { dbName: 'e2e' })
  const { createServer } = await import('../src/app')
  const { server } = createServer()
  server.listen(PORT, '127.0.0.1', () => console.log(`e2e server on http://127.0.0.1:${PORT}`))
  const stop = async () => {
    server.close()
    await mongoose.disconnect()
    await mongo.stop()
    process.exit(0)
  }
  process.on('SIGTERM', stop)
  process.on('SIGINT', stop)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
