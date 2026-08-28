/* global self */
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute } from 'workbox-precaching'

self.skipWaiting()
clientsClaim()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data?.json() ?? {}
  } catch {
    payload = { body: event.data?.text() ?? '' }
  }
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title ?? 'Language Learning AI', {
      body: payload.body ?? 'I’m here whenever you’re ready to practise.',
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: { url: payload.url ?? '/' },
      }),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'standard-push', body: payload.body }))
      }),
    ]),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data?.url ?? '/'))
})
