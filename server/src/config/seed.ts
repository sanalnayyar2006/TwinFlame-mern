import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Question from '../models/Question'

dotenv.config()



const questions = [
  // Truth
  { text: "What was your first impression of me?", type: 'truth' },
  { text: "What's your favourite memory of us?", type: 'truth' },
  { text: "What do you love most about our relationship?", type: 'truth' },
  { text: "What's one thing you wish I knew about you?", type: 'truth' },
  { text: "When did you know you were falling for me?", type: 'truth' },
  { text: "What's your biggest fear about us?", type: 'truth' },
  { text: "What's one thing I do that makes you smile?", type: 'truth' },
  { text: "What's a dream you've never told me about?", type: 'truth' },

  // Dare
  { text: "Send me a voice note saying why you love me.", type: 'dare' },
  { text: "Write me a 3 line poem right now.", type: 'dare' },
  { text: "Tell me one thing you've never said out loud.", type: 'dare' },
  { text: "Send me your favourite photo of us.", type: 'dare' },
  { text: "Describe me in 5 words only.", type: 'dare' },
  { text: "Share a song that reminds you of me.", type: 'dare' },
  { text: "Tell me your favourite thing about my personality.", type: 'dare' },
  { text: "Recreate your favourite memory of us in words.", type: 'dare' },

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


