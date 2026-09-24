/**
 * The app shells, kept so a page you need offline can be OPENED offline.
 *
 * WHY: these pages already work offline once they are on screen — their state
 * lives in this browser and changes queue up until there is signal. But opening
 * one cold with no connection showed the browser's error page, because the page
 * itself had to be fetched. For something you open on a train, or at eleven at
 * night on no signal, that is the difference between an app and a bookmark.
 *
 * This file is served from the site root, so once installed it sits in front of
 * EVERY page on the site, not just the tracker. Five rules follow from that.
 *
 * 1. NETWORK FIRST, ALWAYS. The cache is a fallback for when the network fails,
 *    never a shortcut when it works. A worker that serves cached JavaScript
 *    first is how an app gets stuck on a version from three weeks ago.
 *
 * 2. ONLY A NAMED PAGE IS EVER STORED, AND ONLY EVER ANSWERED AT ITS OWN
 *    ADDRESS. The first version stored every page it saw and, when any page
 *    failed to load, handed back the tracker's page under that page's address —
 *    so /dashboard/settings could come up as the time tracker, or as a
 *    days-old copy of itself. Every other page is left entirely to the browser:
 *    not stored, not answered from here.
 *
 *    THE LIST IS SHORT ON PURPOSE AND IS NOT A CONVENIENCE. A page earns a
 *    place here by being one somebody opens at the exact moment they have no
 *    connection — a timer started on a train, a vice record opened at eleven at
 *    night. "It would be nice if this worked offline too" is how the list grows
 *    back into "every page it saw", which is the fault this rule exists for.
 *
 * 3. THE SHELL IS STORED WITH ITS SCRIPTS OR NOT AT ALL. Caching the HTML alone
 *    was a trap: after a deploy the stored page named chunk files that had been
 *    thrown out with the previous build's cache, so an offline launch drew the
 *    timer and nothing worked. `warmShell` reads the page's own
 *    `/_next/static/` references out of it and stores those too.
 *
 * 4. NOTHING SIGNED-IN OUTLIVES A SIGN-IN. Cache Storage belongs to the browser,
 *    not to the person. Reaching the login page as a real navigation — a session
 *    that expired, an emailed confirmation link — empties the store, and the
 *    tracker re-warms it the next time it is opened. A shell fetched while
 *    signed out is never stored at all: `warmShell` asks for it with
 *    `redirect: "manual"`, so the login page comes back as an opaque redirect
 *    with `ok === false` and is skipped. `cache.add` was doing the opposite —
 *    following the redirect and filing the login page under the tracker's name.
 *
 * 5. ONE STORE PER BUILD. The store is named after the build id in this file's
 *    registration URL (`/sw.js?v=<build>`), so a new build installs a new worker
 *    with a new store and throws the old one away on activation. A fixed name
 *    would keep stale pages and assets from every past build forever. A build
 *    with no id does not register at all — see OfflineShell.
 *
 * NOTHING FROM /api IS EVER CACHED. Time entries come from the sync layer, which
 * knows what is stale and what is queued. A cached API response would be a
 * second, dumber copy of the truth.
 *
 * WHAT THIS DELIBERATELY DOES NOT PROTECT: the workspace itself, which lives in
 * this browser's localStorage under `toggl-clone:v1` and is not cleared by
 * signing out. That is a real shared-device problem and a bigger decision than
 * a cache — see docs/plans/blast-radius-failsafes.md.
 */

const VERSION = new URL(self.location.href).searchParams.get("v") || "unversioned"
// Named for what it holds: the app's offline shells, not one feature's.
const CACHE = "app-shell-" + VERSION

/**
 * The pages this worker may store and answer. Nothing else, ever.
 *
 * WRITTEN OUT BY HAND, because a worker is a classic script served from the
 * site root: it cannot import `src/shared/lifeMasteryRoutes.ts`, the same
 * reason `proxy.ts`'s matcher is a literal. So the address can move out from
 * under this file silently. `tests/unit/navigation/lifeMasteryRoutes.test.ts`
 * is what stops that — it fails when this list no longer names the address the
 * constant claims, exactly as it already does for the proxy.
 */
const SHELL_PATHS = [
  // Started on a train, in a basement, on the underground.
  "/dashboard/time",
  // The Black Box. Its whole design premise is the moment somebody opens it
  // mid-thought, which is not a moment that waits for signal — and until
  // 2026-09-24 opening it without a connection showed the browser's error page
  // while the page itself was perfectly capable of running from localStorage.
  "/life-mastery/quit-vice",
]

/** Is this one of them? */
function isShell(pathname) {
  return SHELL_PATHS.includes(pathname)
}

/** Fetched flat, because none of them is a page and none of them is personal. */
const SHELL_EXTRAS = ["/manifest.webmanifest", "/icon-192.png", "/icon-512.png"]

/** Static files a page needs to draw itself: scripts, styles, fonts, images. */
function isAsset(request, url) {
  if (url.pathname.startsWith("/_next/static/")) return true
  return ["script", "style", "font", "image", "manifest"].includes(request.destination)
}

/**
 * Store one shell page and everything it needs to draw itself.
 *
 * `redirect: "manual"` is what keeps a signed-out copy out of the store: the
 * proxy answers with a 307 to the login page, which arrives here as an opaque
 * redirect whose `ok` is false, and nothing is written. The alternative,
 * `cache.add`, follows the redirect and stores the login page's HTML under the
 * tracker's address — which Chrome then refuses to use for a navigation, so the
 * offline launch it exists for shows the browser's error page instead.
 */
async function warmShell(cache, path) {
  const response = await fetch(path, { redirect: "manual" })
  if (!response.ok) return

  const html = await response.clone().text()
  await cache.put(path, response)

  // The page names its own scripts and stylesheets. Storing the HTML without
  // them leaves an offline launch drawing markup that never wakes up.
  const assets = new Set()
  for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) assets.add(match[1])
  await Promise.allSettled([...assets].map((url) => cache.add(url)))
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // one failed URL must not fail the whole install, or the app has no shell
      .then((cache) =>
        Promise.allSettled([
          ...SHELL_PATHS.map((path) => warmShell(cache, path)),
          ...SHELL_EXTRAS.map((url) => cache.add(url)),
        ]),
      )
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

/**
 * A shell page, saying "I am on screen for whoever is signed in now".
 *
 * Sent by OfflineShell on every mount, from whichever shell page mounted it. It
 * is what makes rule 4 hold in practice: signing in and out happen as
 * client-side transitions, so the worker sees no
 * navigation to /auth/ on the ordinary path and the URL rule alone would almost
 * never fire. This re-stores the shell for the person actually using it, and
 * re-fills the store after an expiry-driven clear.
 */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "warm-shell") {
    event.waitUntil(
      caches.open(CACHE).then((cache) => Promise.allSettled(SHELL_PATHS.map((path) => warmShell(cache, path)))),
    )
  }
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // the sync endpoint and every other API: the app handles being offline itself,
  // and a cached answer here would be a lie about what the server holds
  if (url.pathname.startsWith("/api/")) return

  const isPage = request.mode === "navigate"

  // Whoever was signed in is not any more, or someone new is about to be: the
  // stored tracker page was theirs. Drop it, and let the browser load the page.
  // The tracker's own warm-shell message fills the store again afterwards.
  if (isPage && url.pathname.startsWith("/auth/")) {
    event.waitUntil(caches.delete(CACHE))
    return
  }

  // Every page except the named shells is the browser's business alone.
  if (isPage && !isShell(url.pathname)) return

  const storable = isPage || isAsset(request, url)

  event.respondWith(
    fetch(request)
      .then((response) => {
        // A navigation's own fetch has `redirect: "manual"`, so a signed-out
        // answer arrives as an opaque redirect with `ok === false` and is
        // skipped by the first test; `redirected` covers a following fetch.
        if (response.ok && !response.redirected && storable) {
          const copy = response.clone()
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)))
        }
        return response
      })
      .catch(async () => {
        const hit = await caches.match(request)
        if (hit) return hit
        throw new Error("offline and not cached")
      }),
  )
})
