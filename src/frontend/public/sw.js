const CACHE = 'siwarga-shell-v1'
const SHELL = ['/', '/offline.html', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // API always goes to network — no offline data in this phase.
  if (url.pathname.startsWith('/api/')) {
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')))
    return
  }

  event.respondWith(
    caches.match(event.request).then(
      (hit) => hit ?? fetch(event.request).then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((cache) => cache.put(event.request, copy))
        return res
      }),
    ),
  )
})
