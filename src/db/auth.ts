import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "./supabase"
import { hasAccess, hasPurchased } from "./profilesRepo"

export type AuthSuccess = {
  success: true
  userId: string
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
 */
export async function requireAuth(): Promise<AuthResult> {
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

  return { success: true, userId: user.id, supabase }
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
