import Link from "next/link"
import { ArrowLeft, CircleDot } from "lucide-react"

import { Button } from "@/components/ui/button"
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

  // Preview mode for non-logged-in users
  if (!user) {
    return (
      <div className="min-h-dvh bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur backdrop-fallback-card">
          <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-4 sm:px-8">
            <div className="flex items-center gap-2 font-bold text-xl text-foreground">
              <CircleDot className="size-6 text-primary" />
              <span>Scenarios</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <span className="text-sm text-amber-600 font-medium">Preview Mode</span>
              </div>
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  <ArrowLeft className="size-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </header>

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

  // Preview mode for users without subscription
  if (!profile?.has_purchased) {
    return (
      <div className="min-h-dvh bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur backdrop-fallback-card">
          <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-4 sm:px-8">
            <div className="flex items-center gap-2 font-bold text-xl text-foreground">
              <CircleDot className="size-6 text-primary" />
              <span>Scenarios</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <span className="text-sm text-amber-600 font-medium">Preview Mode</span>
              </div>
              <Button asChild variant="outline">
                <Link href="/dashboard">
                  <ArrowLeft className="size-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </header>

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

  /* THE GATE, AT THE ONLY DOOR THAT NEEDS IT.
     `scenariosService` is the sole consumer of the region, archetype and
     foreigner answers, so this is where they are asked. It used to check
     `onboarding_completed` -- a flag also guarding the dashboard, the Lair and
     the post-login redirect, none of which read these columns -- and send the
     user to a five-step wizard on another route. Now it asks by looking at the
     columns themselves, and asks inline. */
  if (!hasDatingPreferences(profile)) {
    return (
      <div className="min-h-dvh bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur backdrop-fallback-card">
          <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-4 sm:px-8">
            <div className="flex items-center gap-2 font-bold text-xl text-foreground">
              <CircleDot className="size-6 text-primary" />
              <span>Scenarios</span>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <ArrowLeft className="size-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </header>

        <DatingPreferencesGate
          initialValues={toOnboardingInitialValues(profile)}
          next="/dashboard/scenarios"
          heading="Before your first scenario"
          intro="Scenarios put you in front of a specific person. These answers decide who she is. It is the only place in the app that uses them, and you can change them later."
          submitLabel="Start practising"
        />
      </div>
    )
  }

  const recommendedDifficulty = getRecommendedDifficulty(profile?.level)

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur backdrop-fallback-card">
        <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2 font-bold text-xl text-foreground">
            <CircleDot className="size-6 text-primary" />
            <span>Scenarios</span>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="size-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </header>

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
