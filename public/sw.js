// Service worker mínimo: notificaciones en móvil (new Notification() falla en Android) y acceso directo a registrar.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) { c.postMessage({ type: 'registrar' }); return c.focus() }
      }
      return self.clients.openWindow('/?registrar=1')
    }),
  )
})
