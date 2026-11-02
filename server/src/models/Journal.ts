import mongoose, { Document, Schema } from 'mongoose'

export interface IJournal extends Document {
  title: string
  content: string
  author: mongoose.Types.ObjectId
  coupleId: string
  imageUrl?: string
  createdAt: Date
}

const JournalSchema = new Schema<IJournal>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coupleId: { type: String, required: true },
  imageUrl: { type: String }
  },
  { timestamps: true }
)

// Every list query filters by couple and pages newest first
JournalSchema.index({ coupleId: 1, _id: -1 })

const Journal = mongoose.model<IJournal>('Journal', JournalSchema)
export default Journal