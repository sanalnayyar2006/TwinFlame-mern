import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express'
import type { CorsOptionsDelegate } from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import { logger } from './logger'

const isProduction = process.env.NODE_ENV === 'production'

// Exact origins from CLIENT_URL (comma-separated). No substring matching: "includes('onrender.com')"
// trusted every site anyone hosts on Render's free tier.
const allowedOrigins = new Set(
  (process.env.CLIENT_URL ?? '')
    .split(',')
    .map(o => o.trim().replace(/\/$/, ''))
    .filter(Boolean)
)

class CorsRejected extends Error {}

export const isAllowedOrigin = (origin: string | undefined, host: string | undefined): boolean => {
  // Same-origin navigation, curl, and server-to-server calls send no Origin
  if (!origin) return true
  // Dev server is reached from phones on the LAN, so any origin is fine locally
  if (!isProduction) return true
  if (allowedOrigins.has(origin)) return true
  // In production the API also serves the client, so its own origin is always allowed
  try {
    return !!host && new URL(origin).host === host
  } catch {
    return false
  }
}

export const corsOptions: CorsOptionsDelegate<Request> = (req, callback) => {
  if (isAllowedOrigin(req.headers.origin, req.headers.host)) {
    callback(null, { origin: true, credentials: true })
  } else {
    callback(new CorsRejected('Origin not allowed'))
  }
}

// CSP starts in report-only so Google sign-in can be checked on the live site before enforcing
export const securityHeaders = helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  contentSecurityPolicy: {
    reportOnly: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://accounts.google.com/gsi/client'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com/gsi/style'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://*.googleusercontent.com'],
      connectSrc: ["'self'", 'https://accounts.google.com'],
      frameSrc: ['https://accounts.google.com'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      // Browsers ignore (and warn about) this in report-only mode; turn it on when enforcing
      upgradeInsecureRequests: null
    }
  }
})

const limiter = (windowMinutes: number, limit: number, message: string) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message },
    // Test suites make many auth calls from one address; tests/rateLimit.test.ts turns it back on
    skip: () => process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT !== 'on'
  })

// Login, register, Google, and partner linking: slows password guessing and couple-code guessing
// AUTH_RATE_LIMIT raises the cap for automated end-to-end runs; production keeps the default
export const authLimiter = limiter(15, Number(process.env.AUTH_RATE_LIMIT) || 20, 'Too many attempts. Wait 15 minutes and try again.')

export const uploadLimiter = limiter(60, 30, 'Upload limit reached. Try again in an hour.')

// Turns known failures into JSON with a clear message; everything else is a logged 500
export const errorHandler: ErrorRequestHandler = (err, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof CorsRejected) {
    res.status(403).json({ message: 'Origin not allowed' })
    return
  }
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ message: 'Photo must be 10 MB or smaller.' })
    } else {
      res.status(400).json({ message: 'Only image files (JPG, PNG, WEBP, GIF, HEIC) can be uploaded.' })
    }
    return
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ message: 'Request is too large.' })
    return
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ message: 'Invalid JSON in request body.' })
    return
  }
  // Errors from Express and its libraries carry a 4xx status (e.g. a missing /assets file is 404)
  if (typeof err?.status === 'number' && err.status >= 400 && err.status < 500) {
    res.status(err.status).json({ message: err.status === 404 ? 'Not found' : 'Bad request' })
    return
  }
  logger.error({ err }, 'Unhandled error')
  res.status(500).json({ message: 'Server error' })
}
