import webpush from 'web-push'
import PushSubscription from '../models/PushSubscription'
import { logger } from '../config/logger'

// Push is optional: without VAPID keys the feature is off and the client hides it.
// Generate keys once with: npx web-push generate-vapid-keys
export const pushConfig = () => {
  const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey, VAPID_SUBJECT: subject } = process.env
  return publicKey && privateKey ? { publicKey, privateKey, subject: subject || 'mailto:support@twinflame.app' } : null
}

export interface PushPayload {
  title: string
  body: string
  url: string
  // Same tag replaces an earlier notification instead of stacking
  tag?: string
}

// Sends to every device the user enabled. Expired subscriptions are removed. Never throws.
export const notifyUser = async (userId: string, payload: PushPayload) => {
  const config = pushConfig()
  if (!config) return
  const subs = await PushSubscription.find({ user: userId })
  await Promise.all(subs.map(async sub => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify(payload),
        { vapidDetails: config, TTL: 60 * 60 * 12 }
      )
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      // 404/410: the browser dropped the subscription (uninstalled, permission revoked)
      if (status === 404 || status === 410) await sub.deleteOne()
      else logger.warn({ status }, 'push send failed')
    }
  }))
}
