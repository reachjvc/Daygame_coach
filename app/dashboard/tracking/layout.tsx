import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/src/db/server"
import { TrackingAuthProvider } from "./TrackingAuthContext"

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

  return (
    <TrackingAuthProvider userId={session.user.id}>
      {children}
    </TrackingAuthProvider>
  )
}
