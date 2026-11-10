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
 *    `/_next/static/` references out of it and stores the page only once all of
 *    those are stored too.
 *
 * 4. NOTHING SIGNED-IN OUTLIVES A SIGN-IN. Cache Storage belongs to the browser,
 *    not to the person. Reaching the login page as a real navigation — a session
 *    that expired, an emailed confirmation link — empties the store, and the
 *    tracker re-warms it the next time it is opened. A shell fetched while
 *    signed out is never stored at all: `warmShell` asks for it with
 *    `redirect: "manual"`, so the login page comes back as an opaque redirect
 *    with `ok === false` and is skipped. `cache.add` was doing the opposite —
 *    following the redirect and filing the login page under the tracker's name.
 *    Signing out is a server action that lands on the front page, which this
 *    file never sees, so both Log Out buttons empty the store themselves
 *    first (`src/shared/offlineCopies.ts`).
 *    And a stored shell the server now answers with a redirect is DELETED, not
 *    just left alone: for the live workout that redirect means the workout is
 *    over, and its page must not come back offline as if it were still open.
 *
 * 5. ONE STORE PER BUILD. The store is named after the build id in this file's
 *    registration URL (`/sw.js?v=<build>`), so a new build installs a new worker
 *    with a new store and throws the old one away once the new one holds
 *    every page the old one did, each with its scripts (`dropOldStores`). A fixed name
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
 * site root: it cannot import `src/shared/routes.ts`, the same reason
 * `proxy.ts`'s matcher is a literal. So an address can move out from under this
 * file silently. `tests/unit/navigation/routeList.test.ts` is what stops that:
 * it fails unless this list is exactly `[ROUTES.time, ROUTES.quitVice, ROUTES.liveWorkout]`.
 */
const SHELL_PATHS = [
  // Started on a train, in a basement, on the underground.
  "/time",
  // The Black Box. Its whole design premise is the moment somebody opens it
  // mid-thought, which is not a moment that waits for signal — and until
  // 2026-09-24 opening it without a connection showed the browser's error page
  // while the page itself was perfectly capable of running from localStorage.
  "/plan/quit-vice",
  // The workout you are in the middle of. Gyms are in basements: a phone that
  // locks between sets and reloads with no signal showed the browser's error
  // page in place of the sets (Plans/program-builder.md, Q21). Its sets queue
  // in localStorage and are put back on screen from there; this keeps the page.
  "/training/live",
  // The time & energy audit: answers are kept in localStorage with no signal
  // and sent when it returns (Plans/energy-audit.md, D-OFFLINE); this keeps the
  // page itself, so a ping tapped in a basement opens it.
  "/audit",
]

/** Is this one of them? */
function isShell(pathname) {
  return SHELL_PATHS.includes(pathname)
}

/**
 * Shells whose page is the same whatever the query says: the query is read by
 * the page's own script. A ping opens `/audit?answer=<quarter>&send=<id>`, and
 * with no signal that address matched nothing stored, so the browser's error
 * page came up (alpha test fast-audit-04). These are stored and answered at
 * their path alone. Still rule 2: only the named page, at its own path.
 */
const QUERY_FREE_SHELLS = ["/audit"]

/** The key a page is stored and looked up under. */
function shellKey(request, url) {
  return QUERY_FREE_SHELLS.includes(url.pathname) ? new Request(url.origin + url.pathname) : request
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
  if (!response.ok) {
    // Sent elsewhere: signed out, or — for the live workout — no workout open
    // any more. A copy stored earlier is of something that is over, so it goes.
    if (response.type === "opaqueredirect") await forgetShellEverywhere(path)
    return
  }

  const html = await response.clone().text()

  // The page names its own scripts and stylesheets. Storing the HTML without
  // them leaves an offline launch drawing markup that never wakes up, so the
  // page is stored only once every one of them is (rule 3). One that failed
  // leaves this store as it was: a new build's worker installing while only
  // the scripts fail stored scriptless pages, and the old working copy was
  // then thrown away as replaced (alpha test p10-review-pings-06).
  const added = await Promise.allSettled([...shellAssets(html)].map((url) => cache.add(url)))
  if (added.some((result) => result.status === "rejected")) return
  await cache.put(path, response)
}

/**
 * Does this store hold the page AND every static file it names (rule 3)? A
 * page stored on a visit, whose scripts then failed to load, is not complete.
 */
async function holdsComplete(store, key) {
  const page = await store.match(key)
  if (!page) return false
  for (const asset of shellAssets(await page.clone().text())) {
    if (!(await store.match(asset))) return false
  }
  return true
}

/**
 * Every static file a stored page names: in its tags (`src="/_next/static/…"`)
 * AND in the page data React reads while it wakes the page up, where the
 * page's own chunks are listed as `\"static/chunks/…js\"` and never as a tag.
 * Reading the tags alone missed those, so after a new worker installed, the
 * first reload with no signal stopped on "Loading chunk … failed" and showed
 * the crash page (alpha test slow-pass-04, reproduced 2026-11-09 with the
 * server switched off). The chunks loaded on the page's own visit came from
 * the network before this worker was in charge, so nothing else stored them.
 */
function shellAssets(html) {
  const assets = new Set()
  for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) assets.add(match[1])
  for (const match of html.matchAll(/(?:\/_next\/)?(static\/(?:chunks|css|media)\/[\w\-./()[\]%@]+?\.(?:js|css|woff2))(?=\\?")/g)) {
    assets.add("/_next/" + match[1])
  }
  // Only the build's own files: never a path that climbs out of /_next/static/
  // (a "../" in page data would otherwise reach /api, which is never cached).
  for (const path of assets) if (!path.startsWith("/_next/static/") || path.split("/").includes("..")) assets.delete(path)
  return assets
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

/** The worker's own stores, this build's and older ones (rule 5). */
const SHELL_STORE_PREFIX = "app-shell-"

/**
 * A shell the server now sends elsewhere goes from EVERY store: an older
 * build's store may still be kept (`dropOldStores`), and its copy is as over
 * as this one's (rule 4).
 */
async function forgetShellEverywhere(key) {
  const keys = await caches.keys()
  await Promise.all(
    keys.filter((name) => name.startsWith(SHELL_STORE_PREFIX)).map((name) => caches.open(name).then((store) => store.delete(key))),
  )
}

/**
 * AN OLDER BUILD'S STORE GOES ONCE THIS ONE HOLDS EVERY PAGE IT HELD (alpha
 * test p9-offline-02). A new worker installed during a signal blip stored no
 * page at all, activated anyway, and threw the old store away, so /audit with
 * no signal showed the browser's error page. Until this build's store has the
 * page, the old one keeps serving it, with the old build's scripts stored
 * beside it (rule 3); the page's next warm-shell, with signal, fills this
 * store and the old one goes then. A store that is not this worker's goes at
 * once, as before.
 */
async function dropOldStores() {
  const current = await caches.open(CACHE)
  const keys = await caches.keys()
  await Promise.all(
    keys
      .filter((name) => name !== CACHE)
      .map(async (name) => {
        if (name.startsWith(SHELL_STORE_PREFIX)) {
          const old = await caches.open(name)
          for (const path of SHELL_PATHS) {
            // Held complete, with its scripts: a page alone is no replacement (alpha test p10-review-pings-06).
            if ((await old.match(path)) && !(await holdsComplete(current, path))) return
          }
        }
        await caches.delete(name)
      }),
  )
}

/**
 * A STORED COPY, THIS BUILD'S FIRST (review of be70cb5b). `caches.match`
 * searches the stores oldest first, so while an older build's store is kept
 * (above) its copy of a page this build has stored too was the one shown.
 * This worker's store first, then the others newest first. For a page, a copy
 * stored with all its scripts comes before one without (alpha test
 * p10-review-pings-06): a page this build stored on a visit whose scripts never
 * loaded would otherwise hide the older store's working copy.
 */
async function matchNewestFirst(key, isPage = false) {
  const names = [CACHE, ...(await caches.keys()).filter((name) => name !== CACHE).reverse()]
  let first
  for (const name of names) {
    const store = await caches.open(name)
    const hit = await store.match(key)
    if (!hit) continue
    if (!isPage || (await holdsComplete(store, key))) return hit
    first = first || hit
  }
  return first
}

self.addEventListener("activate", (event) => {
  event.waitUntil(dropOldStores().then(() => self.clients.claim()))
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
      caches
        .open(CACHE)
        .then((cache) => Promise.allSettled(SHELL_PATHS.map((path) => warmShell(cache, path))))
        .then(() => dropOldStores()),
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
    // Every store of this worker's, an older build's still kept included.
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.filter((name) => name.startsWith(SHELL_STORE_PREFIX)).map((name) => caches.delete(name)))),
    )
    return
  }

  // Every page except the named shells is the browser's business alone.
  if (isPage && !isShell(url.pathname)) return

  const storable = isPage || isAsset(request, url)
  const key = isPage ? shellKey(request, url) : request

  event.respondWith(
    fetch(request)
      .then((response) => {
        // A navigation's own fetch has `redirect: "manual"`, so a signed-out
        // answer arrives as an opaque redirect with `ok === false` and is
        // skipped by the first test; `redirected` covers a following fetch.
        if (response.ok && !response.redirected && storable) {
          const copy = response.clone()
          event.waitUntil(caches.open(CACHE).then((cache) => cache.put(key, copy)))
        } else if (isPage && response.type === "opaqueredirect") {
          // The server sent this page elsewhere: the workout it showed is
          // finished or thrown away, or nobody is signed in. The stored copy
          // must not come back the next time there is no signal, offering a
          // finished workout as if it were still open.
          event.waitUntil(forgetShellEverywhere(key))
        }
        return response
      })
      .catch(async () => {
        const hit = await matchNewestFirst(key, isPage)
        if (hit) return hit
        throw new Error("offline and not cached")
      }),
  )
})

/* ===========================================================================
 * NOTIFICATIONS — a separate job from everything above, sharing the file only
 * because a site gets one worker per address range (Plans/thought.md, B-SW).
 * Nothing below reads or writes the offline store, and nothing above touches
 * a notification.
 *
 * 1. EVERY PUSH SHOWS A NOTIFICATION. Browsers require it, and a push that
 *    shows nothing gets the site's permission withdrawn.
 * 2. ONE TAG PER KIND. A new reminder replaces the last on screen, so an
 *    afternoon of unanswered reminders is one notification, not thirty.
 * 3. NOTHING PRIVATE UNLESS ASKED. The text comes from the server, which sends
 *    a generic line unless the person switched "show thoughts" on.
 * 4. A TAP OPENS THE APP WHERE THE PAYLOAD SAYS — always a page on this site,
 *    never an address from outside it.
 * 5. SOUND IS THE PAYLOAD'S TO DECIDE. `silent` and `renotify` are read from
 *    it; a payload that says nothing rings, as reminders always have. The
 *    running timer says silent, not renotifying (Plans/time-tracker-like-
 *    toggl.md, Q4): twelve switches a day must not be twelve buzzes.
 *
 * THE RUNNING TIMER (kind "timetrack-running", tag "timer-running") is the
 * second user. Its one button, Stop, posts to /api/timetrack/stop with the
 * time of the TAP; with no signal, the stop waits in IndexedDB and goes by
 * Background Sync, or when the app next opens, still with the tap time. Its
 * tag is its own, so it never replaces a reminder, nor a reminder it.
 * ======================================================================== */

const TIMER_KIND = "timetrack-running"
const TIMER_TAG = "timer-running"
const TIMER_URL = "/time?view=timer"
const STOP_SYNC_TAG = "timetrack-stop"

/** A page on this site, or `fallback` (the audit) when the payload names anything else. */
function sameSiteUrl(raw, fallback = "/audit") {
  try {
    const url = new URL(raw || fallback, self.location.origin)
    if (url.origin === self.location.origin) return url.href
  } catch {
    // fall through
  }
  return new URL(fallback, self.location.origin).href
}

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }
  const timer = data.kind === TIMER_KIND
  const actions = Array.isArray(data.actions) ? data.actions.slice(0, 2) : []
  const shown = self.registration.showNotification(data.title || (timer ? "Timer" : "Time & energy audit"), {
    body: data.body || (timer ? "Time tracker" : ""),
    tag: data.tag || (timer ? TIMER_TAG : "audit-ping"),
    renotify: data.renotify !== false,
    silent: data.silent === true,
    icon: "/icon-192.png",
    timestamp: Date.now(),
    data: timer
      ? {
          url: sameSiteUrl(data.url, TIMER_URL),
          kind: TIMER_KIND,
          entryId: typeof data.entryId === "string" ? data.entryId : null,
          name: typeof data.name === "string" ? data.name : "",
          promptId: null,
          // never a thought: "stop" must not be logged as one
          labels: {},
        }
      : {
          url: sameSiteUrl(data.url),
          kind: typeof data.kind === "string" ? data.kind : null,
          slotAt: typeof data.slotAt === "string" ? data.slotAt : null,
          sendId: typeof data.sendId === "string" ? data.sendId : null,
        },
    actions: actions.map((a) => ({ action: a.id, title: a.title })),
  })
  // A timer push arriving means there is signal: a Stop that waited for it goes
  // now, AFTER this notification is up, so its answer is what stays on screen.
  // Chrome may refuse Background Sync to a worker with no window open, so for a
  // stop tapped in the shade with the app closed this is the usual way out.
  event.waitUntil(timer ? shown.then(() => sendQueuedStops().catch(() => undefined)) : shown)
})

/* --- The running timer's Stop ------------------------------------------- */

/** One small store: a stop tapped with no signal, by entry, until it is sent. */
function openStops() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("timer-stops", 1)
    req.onupgradeneeded = () => req.result.createObjectStore("stops", { keyPath: "entryId" })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Run `work` in one transaction on the store; resolves with what `work` reported once it commits. */
async function inStops(mode, work) {
  const db = await openStops()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("stops", mode)
    let result
    work(tx.objectStore("stops"), (value) => (result = value))
    tx.oncomplete = () => {
      db.close()
      resolve(result)
    }
    tx.onerror = tx.onabort = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/** Keep a stop for later. A second tap on the same timer keeps the FIRST tap's time. */
function queueStop(stop) {
  return inStops("readwrite", (store) => {
    const read = store.get(stop.entryId)
    read.onsuccess = () => {
      if (!read.result) store.put(stop)
    }
  })
}

function queuedStops() {
  return inStops("readonly", (store, report) => {
    const all = store.getAll()
    all.onsuccess = () => report(all.result || [])
  })
}

function dropStop(entryId) {
  return inStops("readwrite", (store) => store.delete(entryId))
}

/**
 * Send one stop. "offline" when it did not get a real answer — no network, or
 * the server in trouble (5xx) — so it is kept and tried again. `sentAt` lets
 * the server correct a phone clock that runs fast or slow.
 */
async function postStop(stop) {
  let res
  try {
    res = await fetch("/api/timetrack/stop", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId: stop.entryId, at: stop.at, sentAt: new Date().toISOString() }),
    })
  } catch {
    return { offline: true }
  }
  if (res.status >= 500) return { offline: true }
  let body = {}
  try {
    body = await res.json()
  } catch {
    body = {}
  }
  return { offline: false, status: res.status, body }
}

/** What to show for the server's answer: its own words when it gave them. */
function answerText(answer, name) {
  if (answer.status === 401) return ["Not stopped", "You are signed out here. Tap to open the timer."]
  const b = answer.body || {}
  if (typeof b.title === "string" && b.title) return [b.title, typeof b.body === "string" && b.body ? b.body : name || "Time tracker"]
  return answer.status < 300 ? ["Stopped", name || "Time tracker"] : ["Not stopped", "Tap to open the timer."]
}

/** A quiet note under the timer's tag, so it replaces the running notification. */
function showTimerNote(title, body) {
  return self.registration.showNotification(title, {
    body,
    tag: TIMER_TAG,
    silent: true,
    renotify: false,
    icon: "/icon-192.png",
    timestamp: Date.now(),
    data: { url: sameSiteUrl(TIMER_URL, TIMER_URL), kind: TIMER_KIND, entryId: null, name: "", promptId: null, labels: {} },
  })
}

function clockOf(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

/** Ask the browser to wake this worker when there is signal. Not every browser can. */
async function askForSync() {
  try {
    if (self.registration.sync) await self.registration.sync.register(STOP_SYNC_TAG)
  } catch {
    // no Background Sync: the app sends it the next time it opens
  }
}

/**
 * Stop pressed on the notification. The time is taken NOW, at the tap,
 * whatever happens next — unless a stop of this timer is already waiting, in
 * which case that first tap's time is the one sent.
 */
async function stopFromNotification(entryId, name) {
  const waiting = (await queuedStops().catch(() => [])).find((s) => s.entryId === entryId)
  const stop = waiting || { entryId, at: new Date().toISOString(), name: name || "" }
  const answer = await postStop(stop)
  if (answer.offline) {
    await queueStop(stop).catch(() => undefined)
    await askForSync()
    return showTimerNote("Stop saved", `${name || "The timer"} stops at ${clockOf(stop.at)}. It is sent when the phone is back online.`)
  }
  if (waiting) await dropStop(entryId).catch(() => undefined)
  const [title, body] = answerText(answer, name)
  return showTimerNote(title, body)
}

/** Send every stop still waiting. Resolves with how many are still waiting for signal. */
async function sendQueuedStops() {
  const stops = await queuedStops().catch(() => [])
  let waiting = 0
  for (const stop of stops) {
    const answer = await postStop(stop)
    if (answer.offline) {
      waiting++
      continue
    }
    await dropStop(stop.entryId).catch(() => undefined)
    const [title, body] = answerText(answer, stop.name)
    await showTimerNote(title, body)
  }
  return waiting
}

/** Background Sync: signal is back. A stop still unsent fails the sync, so the browser tries again. */
self.addEventListener("sync", (event) => {
  if (event.tag !== STOP_SYNC_TAG) return
  event.waitUntil(
    sendQueuedStops().then((waiting) => {
      if (waiting > 0) throw new Error("still no signal")
    }),
  )
})

/** The tracker, on opening: "send whatever stop is waiting" — for browsers without Background Sync. */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "send-queued-stops") event.waitUntil(sendQueuedStops())
})

/** Bring an open window of the app forward and send it to `url`, or open one. */
async function focusOrOpen(url) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
  for (const client of windows) {
    if (new URL(client.url).origin !== self.location.origin) continue
    try {
      const focused = await client.focus()
      if (focused && "navigate" in focused) {
        await focused.navigate(url)
        return
      }
    } catch {
      // A window this worker does not control cannot be navigated: open a new one.
    }
  }
  if (self.clients.openWindow) await self.clients.openWindow(url)
}

self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data || {}
  event.notification.close()
  if (data.kind === TIMER_KIND) {
    if (event.action === "stop" && data.entryId) {
      event.waitUntil(stopFromNotification(data.entryId, data.name))
      return
    }
    event.waitUntil(focusOrOpen(sameSiteUrl(data.url, TIMER_URL)))
    return
  }
  if (data.kind === "audit-ping" && (event.action === "same" || event.action === "mute") && data.slotAt) {
    event.waitUntil(answerPing(event.action, data))
    return
  }
  event.waitUntil(focusOrOpen(sameSiteUrl(data.url)))
})

/* --- The audit ping's buttons (Plans/energy-audit.md, D-BUTTONS) ---------- */

/**
 * "Same as before" or "Mute 1 h", from the notification itself, with no page
 * open. The server answers with the words to show; they never hold anything
 * the person wrote. On any failure the ping comes back as "Not saved. Tap to
 * answer.", and tapping it opens the answer sheet.
 */
async function answerPing(action, data) {
  const title = "Time & energy audit"
  let shown = { title, body: "Not saved. Tap to answer." }
  let ok = false
  try {
    const res = await fetch("/api/audit/ping", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, slotAt: data.slotAt, sendId: data.sendId }),
    })
    const answer = await res.json().catch(() => ({}))
    ok = res.ok
    if (ok && typeof answer.body === "string") shown = { title: typeof answer.title === "string" ? answer.title : title, body: answer.body }
  } catch {
    ok = false
  }
  await self.registration.showNotification(shown.title, {
    body: ok ? shown.body : "Not saved. Tap to answer.",
    tag: "audit-ping",
    renotify: false,
    silent: true,
    icon: "/icon-192.png",
    timestamp: Date.now(),
    data: { url: sameSiteUrl(data.url), kind: ok ? "audit-answered" : "audit-ping", slotAt: null, sendId: null },
  })
}

/**
 * The browser replaced this device's address (Firefox does; Chrome rarely).
 * Tell the server, which keeps the device's on/off as it was. If this cannot
 * reach the server, the page re-registers the next time it is opened.
 */
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const subscription =
        event.newSubscription ||
        (event.oldSubscription && (await self.registration.pushManager.subscribe(event.oldSubscription.options)))
      if (!subscription) return
      await fetch("/api/notifications/devices", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          oldEndpoint: event.oldSubscription ? event.oldSubscription.endpoint : null,
          intent: "refresh",
          label: "",
        }),
      }).catch(() => undefined)
    })(),
  )
})
