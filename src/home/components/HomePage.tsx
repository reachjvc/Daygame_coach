"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Compass, Heart, Unlink, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PublicShell } from "@/src/home/components/PublicShell"
import { facetFor } from "@/src/shared/facets"
import { ROUTES } from "@/src/shared/routes"

interface HomePageProps {
  isLoggedIn?: boolean
}

const QUIT_DOOR = "/quit"
const SIGN_UP = "/auth/sign-up"
const LOG_IN = "/auth/login"

/** The three doors (W13). Each wears the colour of the part it opens (rule R2). */
const DOORS: { id: string; title: string; text: string; button: string; href: string; icon: LucideIcon }[] = [
  {
    id: "life",
    title: "Life",
    text: "Decide what you want in each part of your life, then live it: your plan, your days, your training, your time.",
    button: "See the life tools",
    href: ROUTES.life,
    icon: Compass,
  },
  {
    id: "quit",
    title: "Quit",
    text: "Free tools for the hard moments of quitting, and a private record of every try.",
    button: "Quit something",
    href: QUIT_DOOR,
    icon: Unlink,
  },
  {
    id: "dating",
    title: "Dating",
    text: "Practise conversations with an AI that answers like a real person, then go out and log what happens.",
    button: "See the dating tools",
    href: ROUTES.dating,
    icon: Heart,
  },
]

/**
 * THE FRONT PAGE: the umbrella, with three doors (Plans/rebrand-10kdaysclub.md,
 * Phase 5; words W10–W14). The old front page, all dating, lives on as the
 * Dating door (`DatingPage`), and its prices on their own page (`/pricing`).
 */
export function HomePage({ isLoggedIn = false }: HomePageProps) {
  const router = useRouter()
  /* The prices used to sit on this page at `#pricing`, and old links, bookmarks
     and the installed app may still ask for them there. Send them on. */
  useEffect(() => {
    const go = () => {
      if (window.location.hash === "#pricing") router.replace(ROUTES.pricing)
    }
    go()
    window.addEventListener("hashchange", go)
    return () => window.removeEventListener("hashchange", go)
  }, [router])

  return (
    <PublicShell isLoggedIn={isLoggedIn}>
      <section className="w-full py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-8">
          <p className="mb-4 text-sm text-muted-foreground">10,000 days is about 27 years.</p>
          <h1 className="mb-6 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Ten years from now, you might be able to say… <span className="text-primary">I DID IT.</span>
          </h1>
          <p className="mx-auto mb-10 text-pretty text-lg leading-relaxed text-muted-foreground">
            Plan the life you want, build the habits that get you there, quit what holds you back, and get better at
            dating. One day at a time.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="min-h-11 px-6" data-testid="front-start">
              <Link href={SIGN_UP}>Start free</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="min-h-11 px-6">
              <Link href={LOG_IN}>Log in</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="w-full pb-16" aria-labelledby="doors-title">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <h2 id="doors-title" className="mb-6 text-balance text-center text-2xl font-bold text-foreground sm:text-3xl">
            Where do you want to start?
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {DOORS.map((d) => (
              <Card
                key={d.id}
                className="flex flex-col gap-3 border-t-4 border-t-primary p-5 sm:p-6"
                data-facet={facetFor(d.href)}
                data-testid={`door-${d.id}`}
              >
                <div className="flex items-center gap-3">
                  <d.icon className="size-7 text-primary" aria-hidden />
                  <h3 className="text-xl font-semibold text-foreground">{d.title}</h3>
                </div>
                <p className="flex-1 leading-relaxed text-muted-foreground">{d.text}</p>
                <Button asChild className="min-h-11 self-start">
                  <Link href={d.href}>{d.button}</Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full pb-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-8">
          <h2 className="mb-3 text-balance text-2xl font-bold text-foreground sm:text-3xl">Day one is today.</h2>
          <p className="mb-8 text-muted-foreground">Every day you count is one of the 10,000.</p>
          <Button asChild size="lg" className="min-h-11 px-6">
            <Link href={SIGN_UP}>Start free</Link>
          </Button>
        </div>
      </section>
    </PublicShell>
  )
}
