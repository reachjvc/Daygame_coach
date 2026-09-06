/**
 * The app shell, kept so it can open with no connection.
 *
 * WHY: the tracker already works offline once it is on screen — the workspace
 * lives in this browser and changes queue up until there is signal. But opening
 * it cold with no connection showed the browser's error page, because the page
 * itself had to be fetched. For something you open on a train, that is the
 * difference between an app and a bookmark.
 *
 * NETWORK FIRST, ALWAYS. The cache is a fallback for when the network fails,
 * never a shortcut when it works. A service worker that serves cached
 * JavaScript first is how an app gets stuck on a version from three weeks ago
 * with no way for anyone to tell it to stop.
 *
 * NOTHING FROM /api IS EVER CACHED. Time entries come from the sync layer,
 * which knows what is stale and what is queued. A cached API response would be
 * a second, dumber copy of the truth.
 */

const CACHE = "timetrack-shell-v1"
const SHELL = ["/dashboard/time", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // one failed URL must not fail the whole install, or the app has no shell
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // the sync endpoint and every other API: the app handles being offline itself,
  // and a cached answer here would be a lie about what the server holds
  if (url.pathname.startsWith("/api/")) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(async () => {
        const hit = await caches.match(request)
        if (hit) return hit
        // a page we have never seen: offer the tracker rather than the browser's
        // error page, since that is the thing being opened
        if (request.mode === "navigate") {
          const shell = await caches.match("/dashboard/time")
          if (shell) return shell
        }
        throw new Error("offline and not cached")
      }),
  )
})
