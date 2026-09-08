import { redirect } from "next/navigation"
import { resolveLoginDestination } from "@/src/profile/loginDestinationService"

/**
 * Post-login redirect handler.
 *
 * Kept for the paths that arrive as a real browser navigation -- the email
 * confirmation link, and the login form's retry if it cannot reach
 * /api/auth/destination. The login form itself no longer comes through here,
 * because a page that only redirects has nothing to show while it decides.
 */
export default async function RedirectPage({
  searchParams,
}: {
  searchParams?: Promise<{
    next?: string | string[]
  }>
}) {
  const params = await searchParams
  const requestedNext =
    typeof params?.next === "string" ? params.next : undefined

  redirect((await resolveLoginDestination(requestedNext)) ?? "/auth/login")
}
