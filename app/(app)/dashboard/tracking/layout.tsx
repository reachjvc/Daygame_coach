import { redirect } from "next/navigation"
import { optionalUserId } from "@/src/db/auth"
import { TrackingAuthProvider } from "./TrackingAuthContext"
import { VoiceLanguageProvider } from "@/src/tracking/components/VoiceLanguageContext"
import { DEFAULT_VOICE_LANGUAGE } from "@/src/tracking/config"
import { getVoiceLanguage } from "@/src/db/settingsRepo"
import { checkSchema } from "@/src/db/schemaCheck"

/**
 * THE ID THIS LAYOUT HANDS DOWN IS A VERIFIED ONE.
 *
 * It read `getSession()`, justified with "Middleware already verified the
 * session". It had not: `proxy.ts` — Next 16's renamed middleware — read the
 * cookie the same unverified way, so the claim was about a check nobody
 * performed. `getSession()` decodes the auth cookie and returns whatever it
 * says; it never asks the identity provider whether the token is genuine,
 * which is why Supabase logs a warning on every load.
 *
 * WHAT THAT COST. Row-level security still checks the token at the database,
 * so nothing could be READ with a forged cookie. But this layout does not only
 * gate the route — it puts `userId` into `TrackingAuthProvider`, and four
 * client pages read it from there. Anything downstream that trusts that id
 * without a query of its own is trusting a string the browser supplied.
 *
 * `optionalUserId()` is the facade in `src/db/auth.ts`, and it calls
 * `getUser()`, which verifies the JWT with the provider. The cost is one
 * network call on a cold load of this section; the alternative was a comment
 * asserting a guarantee that did not exist.
 */
export default async function TrackingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check for missing migrations on first load (logs warnings to console)
  checkSchema().catch(() => {}) // Fire and forget, don't block render

  const userId = await optionalUserId()
  if (!userId) {
    redirect("/auth/login")
  }

  const voiceLanguage = (await getVoiceLanguage(userId)) ?? DEFAULT_VOICE_LANGUAGE

  return (
    <VoiceLanguageProvider language={voiceLanguage}>
      <TrackingAuthProvider userId={userId}>{children}</TrackingAuthProvider>
    </VoiceLanguageProvider>
  )
}
