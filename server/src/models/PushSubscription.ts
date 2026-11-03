import mongoose, { Document, Schema } from 'mongoose'

// One row per browser/device a user turned notifications on in
export interface IPushSubscription extends Document {
  user: mongoose.Types.ObjectId
  endpoint: string
  keys: { p256dh: string; auth: string }
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true }
    }
  },
  { timestamps: true }
)

const PushSubscription = mongoose.model<IPushSubscription>('PushSubscription', PushSubscriptionSchema)
export default PushSubscription
