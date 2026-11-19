import Link from "next/link"
import { BarChart3, Brain, Footprints, MessageCircle, Swords, Zap, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PublicShell } from "@/src/home/components/PublicShell"
import { ROUTES } from "@/src/shared/routes"

const SIGN_UP = "/auth/sign-up"

const CARDS: { title: string; text: string; icon: LucideIcon }[] = [
  {
    title: "Realistic Conversations",
    text: "Practice with AI that responds like real people. Build your conversational skills in a safe environment.",
    icon: MessageCircle,
  },
  {
    title: "Scenario-Based Training",
    text: "Choose from various scenarios: coffee shops, parks, bookstores. Practice different approaches and styles.",
    icon: Swords,
  },
  {
    title: "Instant Feedback",
    text: "Get immediate coaching on your openers, conversation flow, and vibe. Learn what works and what doesn't.",
    icon: BarChart3,
  },
  {
    title: "The Field",
    text: "Log every approach when you are out, write field reports, and watch your numbers move.",
    icon: Footprints,
  },
  {
    title: "Inner Game",
    text: "Find the values you live by, so you go out as someone who knows where he is going.",
    icon: Brain,
  },
]

/**
 * THE DATING DOOR (`/dating`): the old front page, moved, not redrawn
 * (Plans/rebrand-10kdaysclub.md, Phase 5; words W30–W35). Its prices moved to
 * `/pricing`. It is in the Dating part, so `primary` here is Dating orange.
 */
export function DatingPage({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <PublicShell isLoggedIn={isLoggedIn}>
      <section className="w-full py-16 sm:py-24 lg:py-32">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-8">
          <Badge className="mb-6 border-primary/20 bg-primary/10 text-primary" variant="outline">
            <Zap className="mr-1 size-3" aria-hidden />
            AI practice
          </Badge>
          <h1 className="mb-6 text-balance text-5xl font-bold tracking-tight text-foreground lg:text-7xl">
            Master Daygame From <span className="text-primary">Home</span>
          </h1>
          <p className="mx-auto mb-12 text-pretty text-xl leading-relaxed text-muted-foreground">
            Practice your approach and conversation skills with our AI coach. Get real-time feedback, build confidence,
            and improve your social interactions without the pressure.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild className="min-h-11 px-6 py-3 text-base">
              <Link href={SIGN_UP}>Start free</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11 border-border bg-transparent px-6 py-3 text-base text-foreground hover:bg-card">
              <Link href={ROUTES.pricing}>See prices</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="w-full bg-card/30 py-8">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-8 md:grid-cols-3">
          {CARDS.map((c) => (
            <Card key={c.title} className="border-border bg-card p-4 sm:p-6" data-testid="dating-card">
              <c.icon className="mb-2 size-12 text-primary" aria-hidden />
              <h3 className="text-xl font-semibold text-foreground">{c.title}</h3>
              <p className="leading-relaxed text-muted-foreground">{c.text}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto my-12 w-full max-w-6xl rounded-lg bg-primary py-16 text-primary-foreground sm:py-24">
        <div className="px-4 text-center sm:px-8">
          <h2 className="mb-6 text-balance text-3xl font-bold">Ready to Build Your Confidence?</h2>
          <p className="mb-8 text-pretty text-lg leading-relaxed opacity-90">Practise at home, then take it to the street.</p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="secondary" className="min-h-11 px-6">
              <Link href={SIGN_UP}>Start free</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-11 border-primary-foreground/40 bg-transparent px-6 text-primary-foreground hover:bg-primary-foreground/10">
              <Link href={ROUTES.pricing}>See prices</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
