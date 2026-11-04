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

import { ACCOUNT_KEY, OFFLINE_BASE_KEY, PENDING_KEY } from "./config"

/** Every key of the tracker starts with this, in `localStorage` and in `sessionStorage` */
const TRACKER_PREFIX = "toggl-clone:"

/** When this tab last started again. Not a tracker key, so claiming the browser does not clear it. */
const RESTARTED_AT_KEY = "tracker-restarted-at"

/**
 * Whose this TAB's session keys are — the timer bar's draft, the manual form.
 * `sessionStorage` belongs to one tab, so a claim made in another tab cannot
 * clear it: A's draft stayed in A's tab, the tab reloaded as B after B claimed
 * the browser elsewhere, and B's bar showed A's words (a security review,
 * 2026-11-04). Each tab now clears its own when this differs from its account.
 */
const TAB_ACCOUNT_KEY = "toggl-clone:tab-account"

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

/**
 * LOG OUT HAS BEGUN IN THIS TAB. Between removing the copy and the session
 * ending there are seconds (the push address is removed over the network
 * first), and a send retry landing in them saw the copy gone and reloaded the
 * page — before the sign-out, leaving the person signed in on a shared
 * computer (a security review, 2026-11-04). Now the tracker stops sending the
 * moment Log Out begins, and nothing in this tab starts again for it; the other
 * tabs do, from the storage event. The next claim — somebody signing in and
 * opening the tracker in this same tab — ends it.
 */
let signingOut = false
const signingOutListeners = new Set<() => void>()

export function isSigningOut(): boolean {
  return signingOut
}

/** Told once Log Out begins in this tab. Returns how to stop listening. */
export function whenSigningOut(listener: () => void): () => void {
  signingOutListeners.add(listener)
  return () => {
    signingOutListeners.delete(listener)
  }
}

/** Remove every key of the tracker, from this browser and from this tab, or from this tab only */
function removeTrackerKeys(only: "tab" | "all" = "all"): void {
  const stores = only === "tab" ? [() => window.sessionStorage] : [() => window.localStorage, () => window.sessionStorage]
  for (const pick of stores) {
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
  signingOut = true
  for (const listener of signingOutListeners) listener()
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
 * sent. A copy with no owner recorded is adopted — unless its own rows say it
 * is somebody else's (`namesAnotherAccount`).
 *
 * Removed, recorded, and removed again: a tab of the previous account that
 * checked its ownership just before the first sweep may still write once
 * between the two (storage is shared, a check and a write are not one step),
 * and the second sweep takes that write away. After the record, its checks fail.
 */
export function claimBrowserCopy(account: string): void {
  if (typeof window === "undefined") return
  signingOut = false
  claimBrowser(account)
  claimThisTab(account)
}

function claimBrowser(account: string): void {
  const owner = browserOwner()
  if (owner === undefined || owner === account) return
  const stranger = owner !== null || namesAnotherAccount(account)
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

/** This tab's drafts are `account`'s from now on; another account's go first */
function claimThisTab(account: string): void {
  try {
    if (window.sessionStorage.getItem(TAB_ACCOUNT_KEY) === account) return
    removeTrackerKeys("tab")
    window.sessionStorage.setItem(TAB_ACCOUNT_KEY, account)
  } catch {
    // no session storage: nothing is kept in it
  }
}

/**
 * The accounts this browser's copy names itself: the `user_id` on every queued
 * row (the mapper stamps it), and the owner of a base kept for the account.
 * A copy kept before owners were recorded says whose it is this way.
 */
function accountsTheCopyNames(): Set<string> {
  const names = new Set<string>()
  try {
    const raw = window.localStorage.getItem(PENDING_KEY)
    const queue = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    for (const rows of Object.values(queue ?? {})) {
      for (const row of Array.isArray(rows) ? rows : []) {
        const id = (row as { user_id?: unknown } | null)?.user_id
        if (typeof id === "string" && id !== "" && id !== "self") names.add(id)
      }
    }
  } catch {
    // an unreadable queue names nobody
  }
  try {
    const raw = window.localStorage.getItem(OFFLINE_BASE_KEY)
    const owner = raw ? (JSON.parse(raw) as { owner?: unknown }).owner : undefined
    if (typeof owner === "string" && owner !== "") names.add(owner)
  } catch {
    // as above
  }
  return names
}

/**
 * A copy with no owner recorded whose rows name another account: kept by a Log
 * Out from before this existed, which left the tracker behind. The owner's own
 * copies from then name the owner, and are adopted with their unsent work.
 */
function namesAnotherAccount(account: string): boolean {
  return [...accountsTheCopyNames()].some((name) => name !== account)
}

/** The one account an unowned copy names, if it names exactly one: whose its unsent work is */
export function accountTheCopyNames(): string | null {
  const names = [...accountsTheCopyNames()]
  return names.length === 1 ? names[0] : null
}
