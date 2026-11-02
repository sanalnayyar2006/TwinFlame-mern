import path from 'path'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { createServer as createHttpServer } from 'http'
import { Server as IOServer } from 'socket.io'
import jwt from 'jsonwebtoken'
import authRoutes from './routes/auth'
import journalRoutes from './routes/journal'
import truthDareRoutes from './routes/TruthDare'
import galleryRoutes from './routes/gallery'
import dailyConnectionRoutes from './routes/dailyConnection'
import User from './models/User'
import { corsOptions, errorHandler, isAllowedOrigin, securityHeaders } from './config/security'
import { logger, requestLogger } from './config/logger'

// Builds the HTTP app, routes, and Socket.IO without connecting to Mongo or listening,
// so tests can create one per file. index.ts does the connecting and listening.
export function createServer() {
  const app = express()
  const isProduction = process.env.NODE_ENV === 'production'

  // Render sits behind one proxy; needed for correct client IPs in rate limiting
  if (isProduction) app.set('trust proxy', 1)

  app.use(requestLogger)
  app.use(securityHeaders)
  app.use(cors(corsOptions))
  // Large until existing base64 journal photos are migrated (scripts/migrateJournalImages.ts)
  app.use(express.json({ limit: '10mb' }))
  app.use(cookieParser())
  app.use('/api/auth', authRoutes)
  app.use('/api/journal', journalRoutes)
  app.use('/api/truth-dare', truthDareRoutes)
  app.use('/api/gallery', galleryRoutes)
  app.use('/api/daily-connection', dailyConnectionRoutes)
  app.get('/health', (_req, res) => {
    res.json({ status: 'TwinFlame API is running 🔥' })
  })
  // Unknown API routes get JSON, not the SPA's index.html
  app.use('/api', (_req, res) => {
    res.status(404).json({ message: 'API route not found' })
  })

  const server = createHttpServer(app)
  const io = new IOServer(server, {
    // Same origin rules as the REST API; the browser's Origin is checked before the handshake
    allowRequest: (req, callback) => callback(null, isAllowedOrigin(req.headers.origin, req.headers.host)),
    cors: { origin: true, credentials: true }
  })

  // Authenticate socket connections and place each user in their rooms
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token ?? socket.handshake.query?.token
      if (!token) return next(new Error('Authentication required'))

      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string }
      const user = await User.findById(decoded.id).select('coupleId partnerId')
      if (!user) return next(new Error('User not found'))

      socket.data.userId = user._id.toString()
      // Personal room so the server can reach this user before they're in a couple (see linkPartner)
      socket.join(`user_${user._id}`)
      if (user.coupleId) socket.join(`couple_${user.coupleId}`)
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', socket => {
    logger.debug({ userId: socket.data.userId }, 'socket connected')
  })

  // Controllers emit real-time events through req.app.get('io')
  app.set('io', io)

  if (isProduction) {
    const distPath = path.resolve(__dirname, '../../client/dist')
    // Vite puts a content hash in every asset name, so browsers can keep them for a year;
    // index.html stays uncached so a deploy is picked up on the next load
    app.use('/assets', express.static(path.join(distPath, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }))
    app.use(express.static(distPath, { maxAge: 0 }))
    // Everything that isn't an API route is the React app
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'), err => {
        if (err) {
          logger.error({ err }, 'index.html missing; build the client first')
          res.status(500).send('Error loading frontend. Make sure the client is built.')
        }
      })
    })
  }

  app.use(errorHandler)

  return { app, server, io }
}
