// TwinFlame service worker: installable app shell, offline fallback, and push notifications.
// API and socket traffic is never cached, so private data is always fresh from the server.
const SHELL = 'twinflame-shell-v1'
const ASSETS = 'twinflame-assets-v1'

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.add('/index.html')).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== ASSETS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return

  // Pages: network first so a deploy shows up straight away; cached shell when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) caches.open(SHELL).then(cache => cache.put('/index.html', response.clone()))
          return response
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  // Hashed build files never change, so the cached copy is always right
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(hit => hit || fetch(request).then(response => {
        if (response.ok) caches.open(ASSETS).then(cache => cache.put(request, response.clone()))
        return response
      }))
    )
  }
})

// Payload: { title, body, url, tag } from server/src/services/push.ts
self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { /* show the default */ }
  event.waitUntil(
    self.registration.showNotification(data.title || 'TwinFlame', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag,
      data: { url: data.url || '/dashboard' }
    })
  )
})

// Focus an open TwinFlame window if there is one, otherwise open the app
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/dashboard', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
      const open = windows.find(w => new URL(w.url).origin === self.location.origin)
      if (open) return open.navigate(target).then(w => (w || open).focus())
      return self.clients.openWindow(target)
    })
  )
})
