/**
 * THE ACCOUNT A PAGE WAS OPENED FOR, named on every request it makes
 * (`src/shared/pageAccount.ts` says why).
 *
 * Two ways, for two kinds of request:
 *   - The plan's own client calls (`lifePlanClient`, `lifePlanDayClient`) are
 *     handed the account and name it themselves, because some run after the
 *     page has gone (a save sent as you leave /plan) and must still name the
 *     account they were made for.
 *   - Everything else the page draws, the old goals list on Track and its
 *     forms among them, is covered by `nameEveryRequest` while the page is
 *     open: one wrapper rather than an account handed to every component.
 *
 * A refusal tells the page that was opened for the account the request named,
 * and only that page, so a late answer to an old page's request cannot stop
 * the page that replaced it.
 */

import { ACCOUNT_CHANGED_HEADER, PAGE_ACCOUNT_HEADER } from "@/src/shared/pageAccount"

/** What a request refused for another account says, wherever it was made. */
export const ACCOUNT_CHANGED_MESSAGE =
  "You signed in to another account in another tab. This page has stopped saving; reload it to see that account."

const listeners = new Map<string, Set<() => void>>()

/** The header naming the account a request is for. */
export function accountHeaders(account: string): Record<string, string> {
  return { [PAGE_ACCOUNT_HEADER]: account }
}

/** Be told when a request naming `account` was refused. Returns the undo. */
export function onAccountChanged(account: string, changed: () => void): () => void {
  const set = listeners.get(account) ?? new Set()
  set.add(changed)
  listeners.set(account, set)
  return () => {
    set.delete(changed)
    if (set.size === 0 && listeners.get(account) === set) listeners.delete(account)
  }
}

/**
 * True when the server refused a request naming `account` because this
 * browser is now signed in as somebody else; tells that account's page. The
 * caller then treats the request as not done.
 */
export function refusedForAccount(res: Response, account: string): boolean {
  if (res.headers.get(ACCOUNT_CHANGED_HEADER) !== "1") return false
  for (const changed of listeners.get(account) ?? []) changed()
  return true
}

/** The app's own API, which is where the header means something; nothing else is touched. */
function ownApi(input: RequestInfo | URL): boolean {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
  const url = new URL(raw, window.location.href)
  return url.origin === window.location.origin && url.pathname.startsWith("/api/")
}

/**
 * While the page is open, name `account` on every request it makes to the
 * app's own API, and tell the page when one is refused. Returns the undo,
 * which puts the browser's own `fetch` back.
 */
export function nameEveryRequest(account: string): () => void {
  // `globalThis`, which is `window` in a browser and what a bare `fetch(` reads.
  const original = globalThis.fetch
  const named: typeof fetch = async (input, init) => {
    if (!ownApi(input)) return original(input, init)
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    if (!headers.has(PAGE_ACCOUNT_HEADER)) headers.set(PAGE_ACCOUNT_HEADER, account)
    const res = await original(input, { ...init, headers })
    refusedForAccount(res, headers.get(PAGE_ACCOUNT_HEADER)!)
    return res
  }
  globalThis.fetch = named
  return () => {
    if (globalThis.fetch === named) globalThis.fetch = original
  }
}
