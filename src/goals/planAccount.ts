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
  // Off once undone, even if something wrapped `fetch` after this and keeps
  // this wrapper in its chain: a later page must not go on naming this account.
  let active = true
  const named: typeof fetch = async (input, init) => {
    if (!active || !ownApi(input)) return original(input, init)
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    if (!headers.has(PAGE_ACCOUNT_HEADER)) headers.set(PAGE_ACCOUNT_HEADER, account)
    const res = await original(input, { ...init, headers })
    refusedForAccount(res, headers.get(PAGE_ACCOUNT_HEADER)!)
    return res
  }
  globalThis.fetch = named
  return () => {
    active = false
    if (globalThis.fetch === named) globalThis.fetch = original
  }
}

/**
 * THE COPY SPACE PAGE (`/plan/sandbox`, `src/db/planSandbox.ts`).
 *
 * That page runs the same flow on a hidden account that a signed-in account
 * owns, so it names the HIDDEN account's id (never the signed-in one's) and
 * every request it makes must either act on the hidden account or not happen:
 *
 *   - the plan and day routes get `?target=sandbox`, whatever the caller wrote,
 *     so no call from this page can reach the signed-in account's own plan;
 *   - the copy space's own routes pass;
 *   - sign-out and crash reports pass untouched (they carry no plan data);
 *   - every OTHER request that is not a read (reminders, push devices,
 *     training, the role-model council, goals) never leaves the browser: it
 *     fails here like a dropped connection (a TypeError, as fetch itself would), never as a refusal a sender might file as final. Reads go out naming the hidden account, which every
 *     route behind `requireAuth` refuses as "another account" (409), so what
 *     they would have shown is never the owner's.
 *
 * A guard in the browser is not the security boundary, which is the database:
 * the hidden account's rows are reachable only through the server's session for
 * it. This is what makes the page's own behaviour safe to look at.
 */
const sandboxAccounts = new Set<string>()

/** True when `account` is a copy space page's account (so plan calls name the target). */
export function isSandboxAccount(account: string): boolean {
  return sandboxAccounts.has(account)
}

/** The plan routes the copy space page may call, as itself. */
const SANDBOX_PLAN_PATHS = /^\/api\/life-plan(\/day)?$/
const SANDBOX_OWN_PATHS = /^\/api\/plan-sandbox\/(copy|reset)$/
const PASS_UNTOUCHED = /^\/api\/(auth\/sign-out|errors)$/
const READS = new Set(["GET", "HEAD"])

/** A plan or day route's address, aimed at the copy space. */
export function planApiUrl(path: string, account: string): string {
  return sandboxAccounts.has(account) ? `${path}?target=sandbox` : path
}

/** Put the guard in place for `account` (a hidden account's id). Returns the undo. */
export function guardSandboxRequests(account: string): () => void {
  sandboxAccounts.add(account)
  const original = globalThis.fetch
  let active = true
  const guarded: typeof fetch = async (input, init) => {
    if (!active || !ownApi(input)) return original(input, init)
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    const url = new URL(raw, window.location.href)
    if (PASS_UNTOUCHED.test(url.pathname)) return original(input, init)

    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase()
    const aimed = SANDBOX_PLAN_PATHS.test(url.pathname) || SANDBOX_OWN_PATHS.test(url.pathname)
    if (!aimed && !READS.has(method)) {
      // Looks like the network being down, not like the server saying no: a sender that
      // retries after a failure (the audit queue, notifications) keeps what it could not send.
      throw new TypeError("Blocked in the copy space")
    }
    if (SANDBOX_PLAN_PATHS.test(url.pathname)) url.searchParams.set("target", "sandbox")

    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    headers.set(PAGE_ACCOUNT_HEADER, account)
    const target = input instanceof Request ? new Request(url.href, input) : url.href
    return original(target, { ...init, headers })
  }
  globalThis.fetch = guarded
  return () => {
    active = false
    if (globalThis.fetch === guarded) globalThis.fetch = original
  }
}
