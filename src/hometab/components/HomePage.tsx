import { Suspense } from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createServerSupabaseClient, getProfile } from "@/src/db/server"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { ALL_TOOLS_TILE, TOOLS } from "@/components/navTabs"
import { TrainingCard } from "@/src/programs/components/TrainingCard"
import { ROUTES } from "@/src/shared/routes"
import { PAYWALL_HREF, tileAccess, type ToolViewer } from "../tileAccess"
import { ToolTile } from "./ToolTile"
import { CardPlaceholder, FieldCard, PlanCard, TimeCard } from "./HomeCards"

/**
 * HOME: THE TOOLS YOU USE, THEN WHAT IS ON TODAY.
 *
 * Option E of Plans/site-navigation.md, copied from Grab's home screen: a grid
 * of tool tiles whose last tile opens every tool, then cards. It replaced the
 * Dashboard (Plans/site-navigation-build.md, Phase 1), which was all dating:
 * "choose a training module", six dating cards and the dating answers, and
 * nothing about the plan, training or time. Where each Dashboard block went is
 * written in that plan's Phase 1 report.
 *
 * WHAT DRAWS FIRST. Only the profile and the time zone are read before the
 * page is sent: the tiles need the first (a locked tile) and the date needs
 * the second. Every card streams in its own <Suspense>, so the tiles are never
 * held up by the slowest card (risk 9).
 *
 * Still at `/dashboard`: addresses change last (Phase 5), so every link,
 * bookmark and the installed app's start page land here unchanged.
 */
export async function HomePage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // The proxy sends a signed-out visitor to sign in before this runs; this line
  // is for the type checker and for defence in depth.
  if (!user) redirect("/auth/login")

  const [profile, timezone] = await Promise.all([
    getProfile(user.id),
    getUserTimezone(user.id).catch(() => "UTC"),
  ])
  const viewer: ToolViewer = { has_purchased: profile?.has_purchased ?? false }
  const dateLine = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: timezone }).format(new Date())

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10" data-testid="dashboard-content">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl" data-testid="home-date">{dateLine}</h1>
      <p className="mb-5 text-sm text-muted-foreground">Your tools, then what is on today.</p>

      <nav aria-label="Your tools" className="mb-6 grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3" data-testid="home-tiles">
        {TOOLS.filter((t) => t.tile).map((t) => (
          <ToolTile key={t.id} id={t.id} label={t.short} icon={t.icon} access={tileAccess(t, viewer, ROUTES.dashboard)} />
        ))}
        <ToolTile id="all" label={ALL_TOOLS_TILE.label} icon={ALL_TOOLS_TILE.icon} access={{ state: "open", href: ALL_TOOLS_TILE.href }} />
      </nav>

      {!viewer.has_purchased && (
        /* The Dashboard's "Ready to Start Training?" block, shortened: the
           locks on the tiles above are what it is about. */
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4" data-testid="home-plans-cta">
          <p className="text-sm text-foreground">Tools with a lock open once you subscribe.</p>
          <Link href={PAYWALL_HREF} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            See plans
          </Link>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 [&>*]:min-w-0">
        <div className="md:col-span-2 [&_[data-testid=season-band]]:mb-0">
          <Suspense fallback={<CardPlaceholder testId="home-plan-card" />}>
            <PlanCard userId={user.id} />
          </Suspense>
        </div>
        {/* The Tracking page's card, not a copy: it fetches for itself and
            already holds its height while it loads. */}
        {/* Full width: its own layout puts the button beside the text, which a
            third of a laptop screen squeezed to a word per line. */}
        <div className="md:col-span-2">
          <TrainingCard from={ROUTES.dashboard} />
        </div>
        <Suspense fallback={<CardPlaceholder testId="home-field-card" />}>
          <FieldCard userId={user.id} />
        </Suspense>
        <Suspense fallback={<CardPlaceholder testId="home-time-card" />}>
          <TimeCard userId={user.id} timezone={timezone} />
        </Suspense>
      </div>

    </main>
  )
}
