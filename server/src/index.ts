import './config/env' // validates env before anything reads it
import connectDB from './config/db'
import { createServer } from './app'

const PORT = Number(process.env.PORT) || 8000

connectDB()

const { server } = createServer()

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} (${process.env.NODE_ENV === 'production' ? 'production' : 'development'})`)
})
