import Link from "next/link"
import { BatteryCharging, Dumbbell, ScrollText, Timer, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PublicShell } from "@/src/home/components/PublicShell"

const SIGN_UP = "/auth/sign-up"

const TOOLS: { title: string; text: string; icon: LucideIcon }[] = [
  {
    title: "Your plan",
    text: "A north star, the parts of your life under it, the goals and routines that get you there, and a Today page that shows what to do now.",
    icon: ScrollText,
  },
  { title: "Time Log", text: "See where your hours really go, on your phone or your PC, with reports by project.", icon: Timer },
  { title: "Training", text: "Gym programs that step up the weight for you, set by set at the rack.", icon: Dumbbell },
  {
    title: "Time & energy audit",
    text: "Two weeks of quarter-hour check-ins show what drains you and what builds your life.",
    icon: BatteryCharging,
  },
]

/**
 * THE LIFE DOOR (`/life`, Plans/rebrand-10kdaysclub.md, Phase 5; words W20–W25).
 * In the Life part, so `primary` here is Life gold.
 */
export function LifePage({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <PublicShell isLoggedIn={isLoggedIn}>
      <section className="w-full py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-8">
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Decide what you want. <span className="text-primary">Then live it, one day at a time.</span>
          </h1>
        </div>
      </section>
      <section className="w-full pb-12">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:px-8 md:grid-cols-2">
          {TOOLS.map((t) => (
            <Card key={t.title} className="gap-3 p-5 sm:p-6" data-testid="life-card">
              <div className="flex items-center gap-3">
                <t.icon className="size-7 text-primary" aria-hidden />
                <h2 className="text-xl font-semibold text-foreground">{t.title}</h2>
              </div>
              <p className="leading-relaxed text-muted-foreground">{t.text}</p>
            </Card>
          ))}
        </div>
      </section>
      <section className="w-full pb-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-8">
          <p className="mb-6 text-lg text-foreground">Free with an account.</p>
          <Button asChild size="lg" className="min-h-11 px-6">
            <Link href={SIGN_UP}>Start free</Link>
          </Button>
        </div>
      </section>
    </PublicShell>
  )
}
