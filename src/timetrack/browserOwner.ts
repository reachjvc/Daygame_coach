/**
 * WHOSE TIME TRACKER THIS BROWSER HOLDS.
 *
 * Everything the tracker keeps in a browser — the workspace (`STORAGE_KEY`),
 * the unsent queue and what it was based on, the base kept while the account
 * has not answered, what the background helpers did, the timer bar's draft —
 * is one person's, and none of it said whose. So it outlived Log Out and a
 * session that simply ended, and the next person to sign in on that browser
 * was shown it, offered to upload it, and in two ways had it uploaded into
 * their own account (a privacy audit, 2026-11-04).
 *
 * Now `ACCOUNT_KEY` names the account the whole `toggl-clone:` set belongs to:
 *
 *   - absent: kept before this existed. The first account to open the tracker
 *     adopts it, which is what always happened — the owner's own phone and PC
 *     hold real unsent work in exactly that state.
 *   - an account id: that account's. Opened by anybody else, all of it is
 *     removed before anything reads it: never shown, never sent. A stranger's
 *     unsent changes cannot be sent anywhere safely, so they go with it.
 *   - "" (`SIGNED_OUT_HERE`): Log Out ran here and removed everything. A tab
 *     still open writes nothing more, and whatever is found under this mark is
 *     not adopted by the next account but removed.
 *
 * The page that knows who is signed in (`/time`, which asks the auth server)
 * claims the browser before the tracker reads anything; a page that does not
 * know (the lab, a unit test) passes no account, and none of this applies to it.
 */

import { ACCOUNT_KEY } from "./config"

/** Every key of the tracker starts with this, in `localStorage` and in `sessionStorage` */
const TRACKER_PREFIX = "toggl-clone:"

/** When this tab last started again. Not a tracker key, so claiming the browser does not clear it. */
const RESTARTED_AT_KEY = "tracker-restarted-at"

/** The mark Log Out leaves: no account's copy is here, and nothing found later may be adopted */
export const SIGNED_OUT_HERE = ""

/**
 * The account this browser's tracker copy belongs to. Null: none recorded.
 * Undefined: storage cannot be read here, so nothing is kept to protect.
 */
export function browserOwner(): string | null | undefined {
  try {
    return window.localStorage.getItem(ACCOUNT_KEY)
  } catch {
    return undefined
  }
}

/**
 * The copy in this browser has stopped being `account`'s since this page claimed
 * it: another account opened the tracker in another tab, or Log Out ran. The
 * page must then write nothing more, send nothing more, and start again.
 * No account (the lab, a test): never.
 *
 * An owner of null is not a change: it is a browser whose storage refused the
 * claim, and a page that reloaded on that would reload for ever.
 */
export function ownerChangedUnderneath(account: string | null | undefined): boolean {
  if (!account) return false
  const owner = browserOwner()
  return owner !== null && owner !== undefined && owner !== account
}

/**
 * A page whose account changed underneath it starts again from the server: the
 * reload asks who is signed in now, and opens a clean tracker for that account.
 * Its own copy is not carried over, and nothing of it is sent. One function, so
 * a test can see that it was asked for.
 */
export function startAgain(): void {
  // Never a loop: one reload per ten seconds. A browser that cannot keep the
  // claim (storage refusing writes) would otherwise reload for as long as it is open.
  try {
    const last = Number(window.sessionStorage.getItem(RESTARTED_AT_KEY) ?? 0)
    if (Date.now() - last < 10_000) return
    window.sessionStorage.setItem(RESTARTED_AT_KEY, String(Date.now()))
  } catch {
    // no session storage: reload once more rather than carry on as the previous account
  }
  window.location.reload()
}

/** Remove every key of the tracker, from this browser and from this tab */
function removeTrackerKeys(): void {
  for (const pick of [() => window.localStorage, () => window.sessionStorage]) {
    try {
      const store = pick()
      const keys: string[] = []
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i)
        if (key?.startsWith(TRACKER_PREFIX)) keys.push(key)
      }
      for (const key of keys) store.removeItem(key)
    } catch {
      // storage blocked: nothing was kept in it
    }
  }
}

/**
 * Log Out: everything the tracker kept here goes, including what had not been
 * sent yet — it is one person's, and the browser may be handed to another. The
 * mark left behind tells a tab still open to stop (see `ownerChangedUnderneath`).
 */
export function forgetTimeTrackerOnThisDevice(): void {
  if (typeof window === "undefined") return
  removeTrackerKeys()
  try {
    window.localStorage.setItem(ACCOUNT_KEY, SIGNED_OUT_HERE)
  } catch {
    // storage blocked: nothing was kept to protect
  }
}

/**
 * Opening the tracker as `account`, before anything reads this browser's copy.
 *
 * Another account's copy, or one left under Log Out's mark, is removed — the
 * workspace, the queue, the drafts, all of it — so nothing of it is shown or
 * sent. A copy with no owner recorded is adopted.
 *
 * Removed, recorded, and removed again: a tab of the previous account that
 * checked its ownership just before the first sweep may still write once
 * between the two (storage is shared, a check and a write are not one step),
 * and the second sweep takes that write away. After the record, its checks fail.
 */
export function claimBrowserCopy(account: string): void {
  if (typeof window === "undefined") return
  const owner = browserOwner()
  if (owner === undefined || owner === account) return
  const stranger = owner !== null
  if (stranger) removeTrackerKeys()
  try {
    window.localStorage.setItem(ACCOUNT_KEY, account)
  } catch {
    // storage full: the claim is not recorded, and `ownerChangedUnderneath` reads that as no change
    return
  }
  if (stranger) {
    removeTrackerKeys()
    try {
      window.localStorage.setItem(ACCOUNT_KEY, account)
    } catch {
      // as above
    }
  }
}
