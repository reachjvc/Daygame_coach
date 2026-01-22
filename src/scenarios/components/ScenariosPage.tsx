import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, Target } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createServerSupabaseClient } from "@/src/db/server"
import type { DifficultyLevel } from "@/src/encounters/data/energy"
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

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("has_purchased, onboarding_completed, level, scenarios_completed")
    .eq("id", user.id)
    .single()

  if (!profile?.has_purchased) {
    return (
      <div className="container flex flex-col items-center justify-center min-h-screen text-center">
        <h1 className="text-4xl font-bold mb-4">Subscription Required</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          You need to subscribe to access the Daygame Coach.
        </p>
        <Button asChild size="lg">
          <Link href="/">View Pricing</Link>
        </Button>
      </div>
    )
  }

  if (!profile?.onboarding_completed) {
    redirect("/preferences")
  }

  const recommendedDifficulty = getRecommendedDifficulty(profile?.level)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
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
        />
      </main>
    </div>
  )
}
