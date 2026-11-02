import path from 'path'
import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const isProduction = process.env.NODE_ENV === 'production'

const schema = z.object({
  MONGODB_URI: z.string().min(1, 'is required'),
  JWT_SECRET: z.string().min(1, 'is required'),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'is required'),
  // Must match the client's VITE_GOOGLE_CLIENT_ID so tokens issued for other apps are rejected
  GOOGLE_CLIENT_ID: isProduction ? z.string().min(1, 'is required in production') : z.string().optional(),
  // Comma-separated origins allowed to call the API with credentials, e.g. https://twinflame.app
  CLIENT_URL: z.string().optional()
})

const result = schema.safeParse(process.env)
if (!result.success) {
  console.error('\n❌ Invalid server environment:')
  for (const issue of result.error.issues) {
    console.error(`   ${issue.path.join('.')} ${issue.message}`)
  }
  console.error('   Fix server/.env (or the host settings) and restart.\n')
  process.exit(1)
}

// Short secrets can be brute-forced offline from any issued token
if ((process.env.JWT_SECRET ?? '').length < 32) {
  const msg = 'JWT_SECRET should be at least 32 random characters (try: openssl rand -hex 32)'
  if (isProduction) {
    console.error(`\n❌ ${msg}\n`)
    process.exit(1)
  }
  console.warn(`⚠️  ${msg}`)
}

if (!isProduction && !process.env.GOOGLE_CLIENT_ID) {
  console.warn('⚠️  GOOGLE_CLIENT_ID is not set: Google tokens are not checked against this app (dev only). Copy VITE_GOOGLE_CLIENT_ID from client/.env into server/.env')
}
