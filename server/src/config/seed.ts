import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Question from '../models/Question'

dotenv.config()


const questions = [
  { text: "What was your first impression of me?", category: 'truth' },
  { text: "What's your favourite memory of us?", category: 'truth' },
  { text: "What do you love most about our relationship?", category: 'truth' },
  { text: "What's one thing you wish I knew about you?", category: 'truth' },
  { text: "When did you know you were falling for me?", category: 'truth' },
  { text: "What's your biggest fear about us?", category: 'truth' },
  { text: "What's one thing I do that makes you smile?", category: 'truth' },
  { text: "What's a dream you've never told me about?", category: 'truth' },
  { text: "Send me a voice note saying why you love me.", category: 'dare' },
  { text: "Write me a 3 line poem right now.", category: 'dare' },
  { text: "Tell me one thing you've never said out loud.", category: 'dare' },
  { text: "Send me your favourite photo of us.", category: 'dare' },
  { text: "Describe me in 5 words only.", category: 'dare' },
  { text: "Share a song that reminds you of me.", category: 'dare' },
  { text: "Tell me your favourite thing about my personality.", category: 'dare' },
  { text: "Recreate your favourite memory of us in words.", category: 'dare' },
]
const seed = async () => {
    try{
         await mongoose.connect(process.env.MONGODB_URI as string)
         await Question.deleteMany({})
         await Question.insertMany(questions)
         console.log('✅ Questions seeded!')
         process.exit(0)
    }catch (error) {
  console.error('Seed failed:', error)  // ← already there
  if (error instanceof Error) {
    console.error('Message:', error.message)
    console.error('Stack:', error.stack)
  }
  process.exit(1)
}
}
seed()


