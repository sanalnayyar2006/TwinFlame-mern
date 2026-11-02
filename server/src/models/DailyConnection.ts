import mongoose, { Document, Schema } from 'mongoose'

export interface IDailyResponse {
  user: mongoose.Types.ObjectId
  note: string
  completedAt: Date
  updatedAt: Date
}

export interface IDailyConnection extends Document {
  // coupleId for linked users, `solo_<userId>` before a partner is linked
  coupleKey: string
  // YYYY-MM-DD, see utils/dayKey.ts for how the day is chosen
  date: string
  // Stored so editing the prompt list never rewrites past days
  prompt: string
  responses: IDailyResponse[]
}

const DailyResponseSchema = new Schema<IDailyResponse>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, default: '', maxlength: 500 },
    completedAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
  },
  { _id: false }
)

const DailyConnectionSchema = new Schema<IDailyConnection>(
  {
    coupleKey: { type: String, required: true },
    date: { type: String, required: true },
    prompt: { type: String, required: true },
    responses: { type: [DailyResponseSchema], default: [] }
  },
  { timestamps: true }
)

DailyConnectionSchema.index({ coupleKey: 1, date: 1 }, { unique: true })

const DailyConnection = mongoose.model<IDailyConnection>('DailyConnection', DailyConnectionSchema)
export default DailyConnection
