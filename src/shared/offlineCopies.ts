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

import { forgetThisDevice } from "@/src/notifications/pushClient"
import { forgetThoughtsOnThisDevice } from "@/src/thoughts/logQueue"

/** The live workout's kept server answer (`useLiveWorkout`). */
export const LIVE_COPY_KEY = "live-workout-copy-v1"
/** The live workout's rest clock (`useLiveWorkout`). */
export const LIVE_REST_KEY = "live-workout-rest-v1"
/** The worker's stores are named `app-shell-<build>` (`public/sw.js`, rule 5). */
const SHELL_STORE_PREFIX = "app-shell-"

/**
 * TWO MORE THINGS GO AT SIGN-OUT SINCE THOUGHT FREQUENCIES (2026-10-30):
 * this browser stops receiving the person's reminders (its push address is
 * removed on the server, which needs the session that is about to end, so it
 * goes first), and any thought taps still waiting for signal are dropped, with
 * the page's offline copy of the thoughts — unlike the workout's queued sets,
 * those hold the text of what somebody thought, and a shared phone must not
 * keep it.
 */
export async function forgetOfflineCopies(): Promise<void> {
  await forgetThisDevice()
  forgetThoughtsOnThisDevice()
  try {
    window.localStorage.removeItem(LIVE_COPY_KEY)
    window.localStorage.removeItem(LIVE_REST_KEY)
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
