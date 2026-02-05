import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/src/db/server"
import { TrackingAuthProvider } from "./TrackingAuthContext"
import { VoiceLanguageProvider } from "@/src/tracking/components/VoiceLanguageContext"
import { DEFAULT_VOICE_LANGUAGE } from "@/src/tracking/config"
import { getVoiceLanguage } from "@/src/db/settingsRepo"

export default async function TrackingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()

  // Use getSession() for fast cookie-based auth (no network call)
  // Middleware already verified the session, so we just need the user ID
  const { data: { session } } = await supabase.auth.getSession()

  // Fallback redirect if somehow session is missing (middleware should catch this)
  if (!session?.user) {
    redirect("/auth/login")
  }

  const voiceLanguage = await getVoiceLanguage(session.user.id) ?? DEFAULT_VOICE_LANGUAGE

  return (
    <VoiceLanguageProvider language={voiceLanguage}>
      <TrackingAuthProvider userId={session.user.id}>
        {children}
      </TrackingAuthProvider>
    </VoiceLanguageProvider>
  )
}
