import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
dotenv.config()
import connectDB from './config/db'
import authRoutes from './routes/auth'


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

app.get('/health', (req, res) => {
  res.json({ status: 'TwinFlame API is running 🔥' })
})


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})