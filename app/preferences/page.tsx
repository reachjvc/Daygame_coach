import { redirect } from "next/navigation"
import { createServerSupabaseClient, getProfile } from "@/src/db/server"
import { DatingPreferencesGate } from "@/src/profile/components"
import { toOnboardingInitialValues } from "@/src/profile/profileService"

/**
 * The dating preferences, on their own page.
 *
 * This used to be a five-step signup wizard that every new account was forced
 * through before it could reach anything, and that rewrote every field it held
 * on submit -- so coming back to change one answer silently reset the others.
 * It is now the same one-screen gate that stands in front of scenarios, which
 * is the only feature that reads these answers.
 */
export default async function PreferencesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const profile = await getProfile(user.id)

  return (
    <div className="min-h-dvh bg-background">
      <DatingPreferencesGate
        initialValues={toOnboardingInitialValues(profile)}
        next="/dashboard"
        heading="Who you want to practise with"
        intro="These answers shape the people you meet in scenarios. Nothing else in the app uses them, and you can change them whenever you like."
        submitLabel="Save"
      />
    </div>
  )
}
