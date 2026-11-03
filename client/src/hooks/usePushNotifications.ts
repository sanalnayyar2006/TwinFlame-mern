import { useCallback, useEffect, useState } from 'react'
import { pushService } from '../services/push.service'

export type PushState = 'unavailable' | 'off' | 'on' | 'blocked'

// VAPID keys arrive base64url-encoded; PushManager wants raw bytes
const keyBytes = (base64url: string) => {
  const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

const browserSupportsPush = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

// "Notify me when my partner answers". Unavailable without browser support (e.g. iOS Safari
// outside an installed app), without a service worker (dev builds), or without server keys.
export function usePushNotifications() {
  const [state, setState] = useState<PushState>('unavailable')
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!browserSupportsPush()) return
    let cancelled = false
    ;(async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        const { enabled, publicKey: key } = await pushService.getKey()
        if (cancelled || !enabled || !key || !registration) return
        setPublicKey(key)
        if (Notification.permission === 'denied') return setState('blocked')
        setState((await registration.pushManager.getSubscription()) ? 'on' : 'off')
      } catch {
        // stays unavailable
      }
    })()
    return () => { cancelled = true }
  }, [])

  const enable = useCallback(async () => {
    if (!publicKey) return
    setBusy(true)
    setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'blocked' : 'off')
        return
      }
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) })
      await pushService.subscribe(subscription.toJSON())
      setState('on')
    } catch {
      setError("Couldn't turn on notifications. Try again.")
    } finally {
      setBusy(false)
    }
  }, [publicKey])

  const disable = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const subscription = await (await navigator.serviceWorker.ready).pushManager.getSubscription()
      if (subscription) {
        await pushService.unsubscribe(subscription.endpoint).catch(() => {})
        await subscription.unsubscribe()
      }
      setState('off')
    } catch {
      setError("Couldn't turn off notifications. Try again.")
    } finally {
      setBusy(false)
    }
  }, [])

  return { state, busy, error, enable, disable }
}
