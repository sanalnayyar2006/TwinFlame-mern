import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
dotenv.config()
import connectDB from './config/db'
import authRoutes from './routes/auth'


connectDB()

const app = express()
const PORT = process.env.PORT || 8000

app.use(cors({
  origin: '*',
  credentials: false
}))
app.use(express.json())
app.use(cookieParser())
app.use('/api/auth', authRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'TwinFlame API is running 🔥' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})