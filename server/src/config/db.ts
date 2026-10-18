import mongoose from 'mongoose'
import dns from 'dns'

// Force IPv4 first for DNS resolution to resolve connection issues with MongoDB Atlas (querySrv ENOTFOUND)
try {
  dns.setDefaultResultOrder('ipv4first')
} catch (e) {
  // Ignore error if not supported in older Node versions
}

const connectDB = async (): Promise<void> => {
  const primaryURI = process.env.MONGODB_URI as string
  const fallbackURI = 'mongodb://127.0.0.1:27017/TwinFlameDb'

  try {
    console.log('Connecting to MongoDB Atlas...')
    const conn = await mongoose.connect(primaryURI)
    console.log(`MongoDB Connected (Atlas): ${conn.connection.host}`)
  } catch (error) {
    console.error('MongoDB Atlas connection failed:', error)
    
    // Check if we should try the local fallback
    console.log(`Attempting connection to local MongoDB fallback: ${fallbackURI}...`)
    try {
      const conn = await mongoose.connect(fallbackURI)
      console.log(`MongoDB Connected (Local Fallback): ${conn.connection.host}`)
    } catch (fallbackError) {
      console.error('Local fallback MongoDB connection failed:', fallbackError)
      console.error('\n====================================================================')
      console.error('❌ DATABASE CONNECTION ERROR')
      console.error('Could not connect to MongoDB Atlas or local MongoDB.')
      console.error('Please make sure:')
      console.error('1. Your internet connection is active.')
      console.error('2. Your current IP address is whitelisted in MongoDB Atlas Network Access.')
      console.error('3. Local MongoDB is running if you want to use a local fallback:')
      console.error('   brew services start mongodb-community')
      console.error('====================================================================\n')
      process.exit(1)
    }
  }
}

export default connectDB