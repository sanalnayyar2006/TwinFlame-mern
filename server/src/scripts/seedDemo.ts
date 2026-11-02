// Recreates the public demo couple (Ana and Ben) with sample journal entries.
// The API also does this on its own once the demo is a day old (DEMO_MODE=true).
//   pnpm --filter server seed:demo
import '../config/env'
import mongoose from 'mongoose'
import { resetDemoCouple } from '../demo/demoCouple'

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI as string)
  const { coupleId } = await resetDemoCouple()
  console.log(`Demo couple ready (${coupleId})`)
  await mongoose.disconnect()
}

run().catch(error => {
  console.error(error)
  process.exit(1)
})
