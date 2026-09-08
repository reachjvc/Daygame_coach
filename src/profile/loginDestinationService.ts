import { createServerSupabaseClient } from "@/src/db/server"
import { safeNextPath } from "@/src/shared/safeRedirect"

/**
 * Where a freshly signed-in person belongs.
 *
 * ONE OWNER. Two callers need this answer: the /redirect page (used by the
 * email-confirmation link) and /api/auth/destination (used by the login form,
 * so it can stay on screen instead of parking the browser on a blank page).
 *
 * SIGNING IN DOES NOT ASK ANYTHING. This used to divert anyone without
 * `onboarding_completed` to `/preferences`, a five-step dating questionnaire.
 * That wizard was deleted on 2026-09-08 and nothing writes the flag any more,
 * so the branch sent EVERY account to `/preferences` on EVERY login -- including
 * straight after saving there, because saving does not set a flag that now means
 * nothing. The questions it asked are read only by `scenariosService`, so they
 * are asked at the scenario door instead; see `hasDatingPreferences`.
 *
 * There is deliberately no profile lookup left here. Nothing about where to land
 * depends on the profile, so nothing should be read to decide it.
 *
 * Returns null when nobody is signed in. Deliberately not the string
 * "/auth/login": that is also a legitimate destination, and a caller cannot tell
 * "you are signed out" from "go to the login page" if both look the same.
 */
export async function resolveLoginDestination(
  requestedNext?: string | null
): Promise<string | null> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  return safeNextPath(requestedNext, "/dashboard")
}
