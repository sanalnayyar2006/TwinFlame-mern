import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import PushSubscription from '../models/PushSubscription'
import { pushConfig } from '../services/push'
import { parseBody, pushSubscriptionSchema, pushUnsubscribeSchema } from '../validation/schemas'

// GET whether push is available and the key browsers need to subscribe
export const getPushKey = (_req: AuthRequest, res: Response) => {
  const config = pushConfig()
  res.status(200).json({ enabled: !!config, publicKey: config?.publicKey ?? null })
}

// POST save this device's subscription (idempotent; moves it to this user if it existed)
export const subscribe = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!pushConfig()) {
    res.status(404).json({ message: 'Notifications are not set up on this server' })
    return
  }
  const body = parseBody(pushSubscriptionSchema, req.body, res)
  if (!body) return
  try {
    await PushSubscription.findOneAndUpdate(
      { endpoint: body.endpoint },
      { user: req.user!._id, endpoint: body.endpoint, keys: body.keys },
      { upsert: true }
    )
    res.status(201).json({ message: 'Notifications on' })
  } catch (error) {
    console.error('subscribe error:', error)
    res.status(500).json({ message: 'Server error' })
  }
}

// DELETE this device's subscription; only the owner can remove it
export const unsubscribe = async (req: AuthRequest, res: Response): Promise<void> => {
  const body = parseBody(pushUnsubscribeSchema, req.body, res)
  if (!body) return
  await PushSubscription.deleteOne({ endpoint: body.endpoint, user: req.user!._id })
  res.status(200).json({ message: 'Notifications off' })
}
