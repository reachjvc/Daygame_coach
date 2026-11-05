import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { createServerSupabaseClient } from "./supabase"
import { hasAccess, hasPurchased } from "./profilesRepo"
import { ACCOUNT_CHANGED_HEADER, PAGE_ACCOUNT_HEADER } from "@/src/shared/pageAccount"

export type AuthSuccess = {
  success: true
  userId: string
  /**
   * Carried because two callers need it and neither should reach for
   * `getUser()` to get it: `/api/whoami` reports it, and the AI allowlist in
   * `/api/test/generate-draft` gates on it. Optional because the identity
   * provider does not guarantee one.
   */
  email: string | undefined
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
}

export type AuthFailure = {
  success: false
  response: NextResponse
}

export type AuthResult = AuthSuccess | AuthFailure

/**
 * Require authentication for an API route.
 * Returns user ID and supabase client on success, or a 401 response on failure.
 *
 * Also refuses (409, `ACCOUNT_CHANGED_HEADER`) a request from a page that
 * names another account in `PAGE_ACCOUNT_HEADER`: it was opened before
 * somebody else signed in on this browser (`src/shared/pageAccount.ts`). Read
 * from `req` when the route passes it, else from the request being served, so
 * every route behind this function is covered. A request that names no
 * account is let through, so a tab still running code from before the header
 * keeps saving until it is reloaded.
 */
export async function requireAuth(req?: Request): Promise<AuthResult> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    }
  }

  if (await namesAnotherAccount(req, user.id)) {
    return {
      success: false,
      response: NextResponse.json(
        // `accountChanged`: what the time tracker's sender reads a 409 by (useTimetrackSync).
        { error: "This page was opened for another account. Reload it.", accountChanged: true },
        { status: 409, headers: { [ACCOUNT_CHANGED_HEADER]: "1" } },
      ),
    }
  }

  return { success: true, userId: user.id, email: user.email, supabase }
}

/** True when the request names an account other than `userId` (see `requireAuth`). */
async function namesAnotherAccount(req: Request | undefined, userId: string): Promise<boolean> {
  let named = req?.headers.get(PAGE_ACCOUNT_HEADER) ?? null
  if (named === null && !req) {
    try {
      named = (await headers()).get(PAGE_ACCOUNT_HEADER)
    } catch {
      // Called outside a request (a test calling a handler directly): nothing to read.
    }
  }
  return named !== null && named !== userId
}

/**
 * Require authentication AND premium subscription for an API route.
 * Returns user ID and supabase client on success, or a 401/403 response on failure.
 */
export async function requirePremium(): Promise<AuthResult> {
  const authResult = await requireAuth()
  if (!authResult.success) return authResult

  if (!(await hasPurchased(authResult.userId))) {
    return {
      success: false,
      response: NextResponse.json({ error: "Premium subscription required" }, { status: 403 }),
    }
  }

  return authResult
}

/**
 * Require authentication AND access (premium purchase OR beta membership)
 * for an API route. Use for the standard feature set; premium-only routes
 * should keep using requirePremium().
 */
export async function requireAccess(): Promise<AuthResult> {
  const authResult = await requireAuth()
  if (!authResult.success) return authResult

  if (!(await hasAccess(authResult.userId))) {
    return {
      success: false,
      response: NextResponse.json({ error: "Access required" }, { status: 403 }),
    }
  }

  return authResult
}

/**
 * The user's id when there is one, `null` when there is not — for the routes
 * that must serve anonymous callers rather than reject them.
 *
 * `/api/errors` is the reason this exists: a crash report is most valuable when
 * the crash happened before login, so it falls back to the forwarded IP for its
 * rate-limit key. Rejecting that caller would lose exactly the reports we most
 * want. Anything that should reject an anonymous caller wants `requireAuth`.
 */
export async function optionalUserId(): Promise<string | null> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}
