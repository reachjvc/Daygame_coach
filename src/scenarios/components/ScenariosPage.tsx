import Link from "next/link"
import { ArrowLeft, Target } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createServerSupabaseClient } from "@/src/db/server"
import type { DifficultyLevel } from "../openers/data/energy"
import { ScenariosHub } from "@/src/scenarios/components/ScenariosHub"

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
          <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-8">
            <div className="flex items-center gap-2 font-bold text-xl text-foreground">
              <Target className="size-6 text-primary" />
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

        <main className="mx-auto max-w-6xl px-8 py-12">
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_purchased, onboarding_completed, level, scenarios_completed")
    .eq("id", user.id)
    .single()

  // Preview mode for users without subscription
  if (!profile?.has_purchased) {
    return (
      <div className="min-h-dvh bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur backdrop-fallback-card">
          <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-8">
            <div className="flex items-center gap-2 font-bold text-xl text-foreground">
              <Target className="size-6 text-primary" />
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

        <main className="mx-auto max-w-6xl px-8 py-12">
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

  // Onboarding check - only for subscribed users
  if (!profile?.onboarding_completed) {
    return (
      <div className="min-h-dvh bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur backdrop-fallback-card">
          <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-8">
            <div className="flex items-center gap-2 font-bold text-xl text-foreground">
              <Target className="size-6 text-primary" />
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

        <main className="mx-auto max-w-6xl px-8 py-12">
          <div className="text-center py-16">
            <h2 className="text-2xl font-bold mb-4">Complete Your Profile First</h2>
            <p className="text-muted-foreground mb-6">Set up your preferences to get personalized scenarios.</p>
            <Button asChild>
              <Link href="/preferences">Complete Setup</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const recommendedDifficulty = getRecommendedDifficulty(profile?.level)

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur backdrop-fallback-card">
        <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-8">
          <div className="flex items-center gap-2 font-bold text-xl text-foreground">
            <Target className="size-6 text-primary" />
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

      <main className="mx-auto max-w-6xl px-8 py-12">
        <ScenariosHub
          recommendedDifficulty={recommendedDifficulty}
          userLevel={profile?.level ?? 1}
          scenariosCompleted={profile?.scenarios_completed ?? 0}
          isPreviewMode={false}
        />
      </main>
    </div>
  )
}
