import path from 'path'
import './config/env'  // ← line 1, before everything
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import connectDB from './config/db'
import authRoutes from './routes/auth'
import journalRoutes from './routes/journal'
import truthDareRoutes from './routes/TruthDare'
import galleryRoutes from './routes/gallery'
import './config/cloudinary'

connectDB()

const app = express()
const PORT = Number(process.env.PORT) || 8000

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

// CORS: allow configured client URL; in development allow LAN origins
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (origin === CLIENT_URL) return callback(null, true)
    if (process.env.NODE_ENV !== 'production') return callback(null, true)
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

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../client/dist')
  app.use(express.static(distPath))
  
  // Catch-all route for React Router (using middleware to avoid path-to-regexp issues)
  app.use((req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API route not found' })
    }
    res.sendFile(path.join(distPath, 'index.html'))
  })
}


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})