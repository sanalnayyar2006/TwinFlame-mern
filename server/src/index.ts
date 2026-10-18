import path from 'path'
import './config/env' // ← line 1, before everything
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { createServer } from 'http'
import { Server as IOServer, type Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import connectDB from './config/db'
import authRoutes from './routes/auth'
import journalRoutes from './routes/journal'
import truthDareRoutes from './routes/TruthDare'
import galleryRoutes from './routes/gallery'
import User from './models/User'
import './config/cloudinary'

connectDB()

const app = express()
const PORT = Number(process.env.PORT) || 8000

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

// CORS: allow configured client URL; in development allow LAN origins
app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin requests (no origin header)
    if (!origin) return callback(null, true)

    // Allow configured CLIENT_URL
    if (origin === CLIENT_URL) return callback(null, true)

    // In production, allow the origin if it matches the current host
    // or if it's a sub-path of the configured CLIENT_URL
    if (process.env.NODE_ENV !== 'production' || origin.includes('onrender.com')) {
      return callback(null, true)
    }

    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())
app.use('/api/auth', authRoutes)
app.use('/api/journal', journalRoutes)
app.use('/api/truth-dare', truthDareRoutes)
app.use('/api/gallery', galleryRoutes)
app.get('/health', (req, res) => {
  res.json({ status: 'TwinFlame API is running 🔥' })
})

const server = createServer(app)
const io = new IOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (origin === CLIENT_URL) return callback(null, true)
      if (process.env.NODE_ENV !== 'production' || origin.includes('onrender.com')) {
        return callback(null, true)
      }
      return callback(new Error('Not allowed by CORS'))
    },
    credentials: true
  }
})

// Authenticate socket connections and place each user in their couple room
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token ?? socket.handshake.query?.token
    if (!token) {
      return next(new Error('Authentication required'))
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as { id: string }

    const user = await User.findById(decoded.id).select('coupleId partnerId')
    if (!user) {
      return next(new Error('User not found'))
    }

    ;(socket as any).userId = user._id.toString()
    ;(socket as any).coupleId = user.coupleId
    if (user.coupleId) {
      socket.join(`couple_${user.coupleId}`)
    }

    next()
  } catch (error) {
    next(new Error('Invalid token'))
  }
})

io.on('connection', (socket) => {
  const me = (socket as any).userId
  const couple = (socket as any).coupleId
  console.log(`Socket connected: ${me} (couple: ${couple ?? 'none'})`)

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${me}`)
  })
})

// Make the Socket.IO instance available to route controllers
app.set('io', io)

// Serve static files in production
const isProduction = process.env.NODE_ENV === 'production'
if (isProduction) {
  const distPath = path.resolve(__dirname, '../../client/dist')
  console.log(`🚀 Production mode detected. Serving static files from: ${distPath}`)

  app.use(express.static(distPath))

  // Catch-all route for React Router
  app.use((req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API route not found' })
    }

    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) {
        console.error('❌ Error sending index.html:', err)
        res.status(500).send('Error loading frontend. Make sure the client is built.')
      }
    })
  })
} else {
  console.log('🛠️  Running in development mode.')
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})

export { io }
