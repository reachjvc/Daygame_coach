import { redirect } from "next/navigation"
import { ROUTES } from "@/src/shared/routes"
import { createServerSupabaseClient } from "@/src/db/server"
import type { DifficultyLevel } from "../openers/data/energy"
import { ScenariosHub } from "@/src/scenarios/components/ScenariosHub"
import { updatePreferredLanguage } from "@/src/settings/actions"
import { hasDatingPreferences } from "@/src/profile/config"
import { toOnboardingInitialValues } from "@/src/profile/profileService"
import { DatingPreferencesGate } from "@/src/profile/components"

function getRecommendedDifficulty(userLevel: number | null | undefined): DifficultyLevel {
  const level = userLevel ?? 1
  if (level < 5) return "beginner"
  if (level < 10) return "intermediate"
  if (level < 15) return "advanced"
  if (level < 20) return "expert"
  return "master"
}

export async function ScenariosPage() {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // The proxy sends a signed-out visitor to sign in before this runs; this line
  // is for the type checker and for defence in depth.
  if (!user) redirect("/auth/login")

  // Query profile - preferred_language is optional (might not exist yet)
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "has_purchased, level, scenarios_completed, preferred_region, archetype, secondary_archetype, tertiary_archetype, dating_foreigners, user_is_foreign, age_range_start, age_range_end"
    )
    .eq("id", user.id)
    .single()

  // Separate query for preferred_language (gracefully handle if column doesn't exist)
  let preferredLanguage: string | null = null
  const { data: langData, error: langError } = await supabase
    .from("profiles")
    .select("preferred_language")
    .eq("id", user.id)
    .single()
  if (!langError && langData) {
    preferredLanguage = langData.preferred_language ?? null
  }
  // If langError, column might not exist yet - use default

  /* THE GATE, AND IT COMES FIRST -- BEFORE THE PAYWALL.
     `scenariosService` is the sole consumer of the region, archetype and
     foreigner answers, so this is where they are asked. It used to check
     `onboarding_completed` -- a flag also guarding the dashboard, the Lair and
     the post-login redirect, none of which read these columns -- and send the
     user to a five-step wizard on another route. Now it asks by looking at the
     columns themselves, and asks inline.

     THE ORDER MATTERS, AND IT WAS WRONG. The paywall check used to sit above
     this one. A brand-new account has not paid, so it was answered by the
     preview and never reached these questions at all -- walked with a fresh
     account on the live site 2026-09-09: the person was shown a browse-only
     page reading "Sign up to start practicing!" while signed in, and was never
     asked anything. The whole point of moving onboarding to this door was that
     clicking Scenarios is what asks. Paying is a separate question, and it is
     asked after. */
  if (!hasDatingPreferences(profile)) {
    return (
      <div className="min-h-dvh bg-background">

        <DatingPreferencesGate
          initialValues={toOnboardingInitialValues(profile)}
          next={ROUTES.scenarios}
          heading="Before your first scenario"
          intro="Scenarios put you in front of a specific person. These answers decide who she is. It is the only place in the app that uses them, and you can change them later."
          submitLabel="Start practising"
        />
      </div>
    )
  }

  /* Now that the questions have been asked, the paywall. Someone who has
     answered but not paid sees the catalogue and what it costs. */
  if (!profile?.has_purchased) {
    return (
      <div className="min-h-dvh bg-background">

        <main className="mx-auto max-w-6xl px-4 sm:px-8 py-8 sm:py-12">
          <ScenariosHub
            recommendedDifficulty="beginner"
            userLevel={1}
            scenariosCompleted={0}
            isPreviewMode={true}
          />
        </main>
      </div>
    )
  }

  const recommendedDifficulty = getRecommendedDifficulty(profile?.level)

  return (
    <div className="min-h-dvh bg-background">

      <main className="mx-auto max-w-6xl px-4 sm:px-8 py-8 sm:py-12">
        <ScenariosHub
          recommendedDifficulty={recommendedDifficulty}
          userLevel={profile?.level ?? 1}
          scenariosCompleted={profile?.scenarios_completed ?? 0}
          isPreviewMode={false}
          initialLanguage={(preferredLanguage as "da" | "en") ?? "da"}
          onLanguageChange={updatePreferredLanguage}
        />
      </main>
    </div>
  )
}
