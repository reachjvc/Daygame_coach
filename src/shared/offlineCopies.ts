/**
 * WHAT THIS BROWSER KEEPS OF THE SIGNED-IN PERSON SO A PAGE OPENS WITH NO
 * SIGNAL, and the one moment it is all dropped: signing out.
 *
 * `public/sw.js` stores a few pages (rule 2 there), and the live workout keeps
 * the server's last answer and its rest clock in `localStorage`. The worker
 * empties its store when it sees a sign-in page — but signing out is a server
 * action that lands on the front page, which the worker never sees as a
 * sign-in page. So the stored live workout survived a sign-out: hand the phone
 * to someone, they open the workout with no signal, and it is yours, with your
 * sets on it. Both Log Out buttons run this first.
 *
 * NOT THE QUEUE OF SETS STILL WAITING FOR SIGNAL. Those are sets somebody did
 * and has not yet saved; deleting them at sign-out would lose them for good.
 * They are only ever sent to the workout they belong to, which the server
 * accepts from its owner alone.
 */

import { forgetAuditOnThisDevice, forgetAuditViewCopy } from "@/src/audit/auditQueue"
import { forgetThisDevice, forgetTimerOnThisDevice } from "@/src/notifications/pushClient"
import { DEVICES_COPY_KEY } from "@/src/notifications/hooks/usePushDevice"
import { forgetTimeTrackerOnThisDevice } from "@/src/timetrack/browserOwner"
import { unsentTrackerChanges } from "@/src/timetrack/hooks/useTimetrackSync"

/** The live workout's kept server answer (`useLiveWorkout`). */
export const LIVE_COPY_KEY = "live-workout-copy-v1"
/** The live workout's rest clock (`useLiveWorkout`). */
export const LIVE_REST_KEY = "live-workout-rest-v1"
/** The worker's stores are named `app-shell-<build>` (`public/sw.js`, rule 5). */
const SHELL_STORE_PREFIX = "app-shell-"

/**
 * TWO MORE THINGS GO AT SIGN-OUT: this browser stops receiving the person's
 * pings (its push address is removed on the server, which needs the session
 * that is about to end, so it goes first), and the old Thoughts queue and page
 * copy are wiped. Thoughts was deleted on 2026-11-08 (Plans/energy-audit.md),
 * but a phone may still hold text it kept: the two keys below are removed at
 * every sign-out, for good, because that text is somebody's thoughts and a
 * shared phone must not keep it.
 *
 * AND THE RUNNING TIMER (time tracker, Phase 7): its notification names what
 * the person is doing, and a Stop waiting for signal names it too; both go,
 * for the same reason.
 */
/**
 * AND THE TIME TRACKER, WHOLE (2026-11-04). Its workspace, unsent queue, drafts
 * and background memory were kept at Log Out, tied to nobody: the next person
 * to sign in was shown the previous person's entries and could have them
 * uploaded into their own account. All of it goes first, before anything here
 * waits on the network — including what had not been sent yet, like the
 * thought taps and unlike the workout's sets: an entry's text is somebody's
 * day, and a tracker tab still open is told to stop (`browserOwner`).
 */
/**
 * AFTER A SIGN-IN: the pages the worker stored are the previous person's. The
 * stored /time page names its account, so opened with no signal it served the
 * previous person's tracker to whoever signed in next (a security review,
 * 2026-11-04). Signing in is a client-side transition the worker never sees as
 * a navigation, so the login page empties the stores itself; the tracker
 * stores its page again, for the right person, the next time it is opened.
 */
export async function forgetStoredPages(): Promise<void> {
  // The audit's last read is a copy of the previous person's day, drawn when
  // /audit opens with no signal: it goes with the stored pages.
  forgetAuditViewCopy()
  // So are the device names kept for no signal (`usePushDevice`).
  try {
    window.localStorage.removeItem(DEVICES_COPY_KEY)
  } catch {
    // Storage blocked: nothing was kept there to forget.
  }
  try {
    if (typeof caches === "undefined") return
    const stores = await caches.keys()
    await Promise.all(stores.filter((name) => name.startsWith(SHELL_STORE_PREFIX)).map((name) => caches.delete(name)))
  } catch {
    // a store that cannot be opened holds nothing that can be served
  }
}

export async function forgetOfflineCopies({
  keepUnsentTime = false,
  deviceForgotten = false,
}: {
  keepUnsentTime?: boolean
  /** Log Out removed this browser's push address already, while the session still existed. */
  deviceForgotten?: boolean
} = {}): Promise<void> {
  // Log Out has sent what it could and asked about the rest (LogOutButton). A
  // sign-out the person did not choose — a password reset — keeps a copy that
  // still holds unsent changes, as a session that ends does: it is theirs, and
  // no other account is shown or sent it (`browserOwner`).
  if (!(keepUnsentTime && unsentTrackerChanges() > 0)) forgetTimeTrackerOnThisDevice()
  if (!deviceForgotten) await forgetThisDevice()
  await forgetTimerOnThisDevice()
  // The audit's answers waiting for signal name what the person did and how it felt.
  forgetAuditOnThisDevice()
  try {
    window.localStorage.removeItem("thoughts-queue-v1")
    window.localStorage.removeItem("thoughts-view-v1")
  } catch {
    // Storage blocked: nothing was kept there to forget.
  }
  try {
    window.localStorage.removeItem(LIVE_COPY_KEY)
    window.localStorage.removeItem(LIVE_REST_KEY)
    // The person's device names, kept for no signal (`usePushDevice`).
    window.localStorage.removeItem(DEVICES_COPY_KEY)
  } catch {
    // Storage blocked: nothing was kept there to forget.
  }
  try {
    if (typeof caches === "undefined") return
    const stores = await caches.keys()
    await Promise.all(stores.filter((name) => name.startsWith(SHELL_STORE_PREFIX)).map((name) => caches.delete(name)))
  } catch {
    // Same: a store that cannot be opened holds nothing that can be served.
  }
}
