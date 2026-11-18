/**
 * THE COPY SPACE: a hidden second account that an account owns, and the server
 * acting as it.
 *
 * WHY A SECOND ACCOUNT. A "view as a new user" switch on the real account is
 * destructive (`Plans/plan-in-steps.md`, the data audit's Q6): the plan save
 * diffs against the real rows and would delete them. A different account has its
 * own user id, its own rows and its own row security, so nothing in any code
 * path can reach the owner's data from it.
 *
 * HOW THE SERVER ACTS AS IT. The owner never signs in to it. For a request that
 * names `target=sandbox` the server:
 *   1. asks the owner's OWN session (row security) for the owner's
 *      `plan_sandboxes` row. No row: `SandboxNotFoundError`, which routes answer
 *      404. The client never names a user id;
 *   2. makes the hidden account on first use (service role: create the user,
 *      record its id on the row);
 *   3. mints a real session for it (service role: `generateLink` for a magic
 *      link, which sends no email, then `verifyOtp` with its token hash on an
 *      anon client that stores nothing). That session's access token is held in
 *      this server's memory only (`CACHE`), never in a cookie, a response or a
 *      log;
 *   4. hands back that client. Every read and write through it runs as the
 *      hidden account: row security and `auth.uid()` (which
 *      `apply_life_plan_changes` relies on) are the hidden account's.
 *
 * THE SERVICE ROLE DOES NOTHING ELSE HERE: it never reads or writes a plan or
 * day row. (`isSandboxUser` reads the `plan_sandboxes` table with it, because a
 * cron has no session; it returns a yes or no.)
 *
 * NOTHING RESOLVES FROM THE SANDBOX BACK TO THE OWNER: the lookup is keyed by
 * the signed-in account's own id, and the hidden account's session never owns a
 * `plan_sandboxes` row, so a request made as it finds none.
 */

import { NextResponse } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { accountChangedResponse } from "./auth"
import { PAGE_ACCOUNT_HEADER } from "@/src/shared/pageAccount"
import { createAdminSupabaseClient, createServerSupabaseClient, unmemoizedFetch } from "./supabase"

/** The only two targets a plan request can name. */
export type PlanTarget = "self" | "sandbox"

/** The signed-in account asked for a copy space it has no row for. Answered 404. */
export class SandboxNotFoundError extends Error {
  constructor() {
    super("No copy space")
    this.name = "SandboxNotFoundError"
  }
}

export interface ResolvedPlanTarget {
  /** Whose rows the request acts on: the session's own, or the hidden account's. */
  userId: string
  /** A client acting AS `userId`: row security is theirs. */
  supabase: SupabaseClient
  /** The signed-in account, always. */
  ownerId: string
  target: PlanTarget
}

/** What the caller already has from its own sign-in. */
export interface Session {
  userId: string
  supabase: SupabaseClient
}

/** Refresh a minted session this long before it expires. */
const REFRESH_MARGIN_MS = 5 * 60_000

/**
 * Minted sessions by hidden account id, in this server's memory only. A session
 * is an hour; one lasts across requests on a warm server, and a cold one mints
 * its own.
 */
const CACHE = new Map<string, { client: SupabaseClient; expiresAt: number }>()

function anonClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    // Nothing stored, nothing refreshed behind our back: the session lives in this object only.
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: unmemoizedFetch },
  })
}

/** The owner's own row, through the owner's own session (row security: only theirs is visible). */
async function ownRow(session: Session): Promise<{ sandbox_user_id: string | null } | null> {
  const { data, error } = await session.supabase
    .from("plan_sandboxes")
    .select("sandbox_user_id")
    .eq("owner_id", session.userId)
    .maybeSingle()
  if (error) throw new Error(`Failed to read the copy space: ${error.message}`)
  return (data as { sandbox_user_id: string | null } | null) ?? null
}

/**
 * Make the hidden account and record it on the owner's row.
 *
 * `sandbox_user_id is null` in the update is the race guard: two first clicks
 * both make a user, one wins the row, the other deletes its own and reads the
 * winner's.
 */
async function createHiddenAccount(ownerId: string): Promise<string> {
  const admin = createAdminSupabaseClient()
  // A random, undeliverable address. No password is ever set, and the address
  // is never shown to a browser.
  const email = `plan-sandbox-${crypto.randomUUID()}@sandbox.invalid`
  const made = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { plan_sandbox: true },
  })
  if (made.error || !made.data.user) throw new Error(`Failed to make the copy space account: ${made.error?.message}`)
  const sandboxId = made.data.user.id

  const claimed = await admin
    .from("plan_sandboxes")
    .update({ sandbox_user_id: sandboxId })
    .eq("owner_id", ownerId)
    .is("sandbox_user_id", null)
    .select("sandbox_user_id")
  if (claimed.error || (claimed.data ?? []).length === 0) {
    await admin.auth.admin.deleteUser(sandboxId)
    if (claimed.error) throw new Error(`Failed to record the copy space: ${claimed.error.message}`)
    const row = await admin.from("plan_sandboxes").select("sandbox_user_id").eq("owner_id", ownerId).maybeSingle()
    const winner = (row.data as { sandbox_user_id: string | null } | null)?.sandbox_user_id
    if (!winner) throw new Error("The copy space row vanished while it was being made")
    return winner
  }
  return sandboxId
}

/** A client signed in as the hidden account, from a cached or freshly minted session. */
async function sandboxClient(sandboxId: string): Promise<SupabaseClient> {
  const cached = CACHE.get(sandboxId)
  if (cached && cached.expiresAt - REFRESH_MARGIN_MS > Date.now()) return cached.client

  const admin = createAdminSupabaseClient()
  const user = await admin.auth.admin.getUserById(sandboxId)
  const email = user.data.user?.email
  if (user.error || !email) throw new Error("The copy space account cannot be found")
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email })
  const tokenHash = link.data?.properties?.hashed_token
  if (link.error || !tokenHash) throw new Error(`Failed to open the copy space: ${link.error?.message}`)

  const client = anonClient()
  const opened = await client.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" })
  // Belt and braces: the session must be the hidden account's, or nothing is returned.
  if (opened.error || !opened.data.session || opened.data.user?.id !== sandboxId) {
    throw new Error(`Failed to sign in to the copy space: ${opened.error?.message ?? "wrong account"}`)
  }
  CACHE.set(sandboxId, { client, expiresAt: Date.now() + opened.data.session.expires_in * 1000 })
  return client
}

/**
 * The account a plan request acts on, and a client acting as it.
 *
 * "self" is the signed-in account and its own client, unchanged.
 * "sandbox" is the hidden account, found only through the signed-in account's
 * own `plan_sandboxes` row; with no row it throws `SandboxNotFoundError`.
 */
export async function resolvePlanTarget(session: Session, target: PlanTarget): Promise<ResolvedPlanTarget> {
  if (target === "self") return { userId: session.userId, supabase: session.supabase, ownerId: session.userId, target }

  const row = await ownRow(session)
  if (!row) throw new SandboxNotFoundError()
  const sandboxId = row.sandbox_user_id ?? (await createHiddenAccount(session.userId))
  return { userId: sandboxId, supabase: await sandboxClient(sandboxId), ownerId: session.userId, target }
}

/**
 * What a route reads from `?target=`: absent is "self", "sandbox" is the copy
 * space, anything else is a refusal. A user id is never accepted here.
 */
export function readTarget(url: string): PlanTarget | "invalid" {
  const value = new URL(url).searchParams.get("target")
  if (value === null) return "self"
  return value === "sandbox" ? "sandbox" : "invalid"
}

export type PlanTargetAuth =
  | ({ success: true } & ResolvedPlanTarget)
  | { success: false; response: NextResponse }

/**
 * Sign-in plus target, for the routes that serve both a real account and the
 * copy space. Replaces `requireAuth` in them.
 *
 * `forceTarget` is for the routes that exist only for the copy space.
 *
 * THE PAGE-ACCOUNT HEADER (`src/shared/pageAccount.ts`) names the account the
 * page was opened for. A copy-space page names the HIDDEN account's id, so
 * every other route, which compares it with the session's own id, refuses the
 * page's requests (409): a second wall behind the page's own request guard. A
 * route that serves the copy space compares it with the hidden account's id
 * here instead. A request naming any other account is refused too.
 */
export async function requirePlanTarget(req: Request, forceTarget?: PlanTarget): Promise<PlanTargetAuth> {
  const target = forceTarget ?? readTarget(req.url)
  if (target === "invalid") {
    return { success: false, response: NextResponse.json({ error: "Unknown target" }, { status: 400 }) }
  }
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    return { success: false, response: NextResponse.json({ error: "Authentication required" }, { status: 401 }) }
  }

  let resolved: ResolvedPlanTarget
  try {
    resolved = await resolvePlanTarget({ userId: user.id, supabase }, target)
  } catch (e) {
    if (e instanceof SandboxNotFoundError) {
      return { success: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) }
    }
    console.error("[plan-sandbox] could not act as the copy space", e instanceof Error ? e.message : "unknown")
    return { success: false, response: NextResponse.json({ error: "Could not open the copy space" }, { status: 500 }) }
  }

  const named = req.headers.get(PAGE_ACCOUNT_HEADER)
  if (named !== null && named !== resolved.userId) return { success: false, response: accountChangedResponse() }
  return { success: true, ...resolved }
}

/**
 * True when `userId` is a hidden copy-space account. For senders and crons,
 * which have no session: they skip it (Plans/plan-in-steps.md, D7).
 * A failed lookup says true, so a failure never sends a reminder to one.
 */
export async function isSandboxUser(userId: string): Promise<boolean> {
  const { data, error } = await createAdminSupabaseClient()
    .from("plan_sandboxes")
    .select("owner_id")
    .eq("sandbox_user_id", userId)
    .limit(1)
  if (error) return true
  return (data ?? []).length > 0
}
