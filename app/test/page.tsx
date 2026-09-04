"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Beaker, BookOpen, Clock, Drama, Medal, Sparkles, User, Video, Crosshair, Palette, Play, FlaskConical, ListChecks, Layers, Orbit, Paintbrush, Navigation, Dumbbell, MessageSquare, CreditCard, Target, HelpCircle, Telescope, Signpost, FileSearch, Waypoints, Clapperboard, Waves, Archive, Aperture, Castle } from "lucide-react"
import { Button } from "@/components/ui/button"

const testPages = [
  {
    name: "Scenario Lab",
    href: "/test/scenario-lab",
    description: "Corpus-grounded cold-read & career-response practice with real-coach receipts",
    icon: Drama,
  },
  {
    name: "Marcus Loop",
    href: "/test/marcus-loop",
    description: "Marcus Aurelius animation loop test",
    icon: Video,
  },
  {
    name: "Role Models",
    href: "/test/role-models",
    description: "Role models component testing",
    icon: User,
  },
  {
    name: "Achievements",
    href: "/test/achievements",
    description: "Achievement system testing",
    icon: Medal,
  },
  {
    name: "Values Curation",
    href: "/test/values-curation",
    description: "Values curation flow testing",
    icon: Sparkles,
  },
  {
    name: "Articles",
    href: "/test/articles",
    description: "Articles system testing",
    icon: BookOpen,
  },
  {
    name: "Evaluator Calibration",
    href: "/test/calibration",
    description: "View evaluator diagnostics and identify blind spots",
    icon: Crosshair,
  },
  {
    name: "Curve Customization",
    href: "/test/curve-customization",
    description: "5 visual variations of the curve customizer (Frost, Cyberpunk, Gold, Neon, Zen)",
    icon: Palette,
  },
  {
    name: "Goal Flow Variants (V1–V9)",
    href: "/test/old-variants",
    description: "9 historical goal setup flow explorations — pick a version to view",
    icon: Sparkles,
  },
  {
    name: "Product Animations",
    href: "/test/animations",
    description: "Animated product showcase for demos and investor reviews",
    icon: Play,
  },
  {
    name: "Goal Achievement Model",
    href: "/test/goal-model",
    description: "Universal goal framework with 8-panelist debate — decomposition tree + action/skills formula",
    icon: FlaskConical,
  },
  {
    name: "Goal Scorecard",
    href: "/test/goal-scorecard",
    description: "Flat daily execution view — grouped by life area, minimal rows, action buttons",
    icon: ListChecks,
  },
  {
    name: "Goals V11 — 5 Complete Experiences",
    href: "/test/goalsv11",
    description: "5 end-to-end reimaginations of the goals experience: discovery, setup, daily use, management",
    icon: Layers,
  },
  {
    name: "Curve Editor (Orrery)",
    href: "/test/curve_editor",
    description: "Milestone curve editor reskinned with aurora orrery aesthetic",
    icon: Orbit,
  },
  {
    name: "Direction Step Colors",
    href: "/test/direction-colors",
    description: "3 color scheme variants for the direction/path selection step",
    icon: Paintbrush,
  },
  {
    name: "Tour Variants",
    href: "/test/tour-variants",
    description: "4 guided tour approaches for the Goals step: strong site, creative, minimalist, narrative",
    icon: Navigation,
  },
  {
    name: "Health & Appearance",
    href: "/test/health",
    description: "Weight, sleep, workout, and nutrition trackers with cross-domain correlation",
    icon: Dumbbell,
  },
  {
    name: "Script Builder",
    href: "/test/script-builder",
    description: "Branching conversation script editor with DA/EN toggle — saves to filesystem JSON",
    icon: MessageSquare,
  },
  {
    name: "Exercising",
    href: "/test/exercising",
    description: "Google Sheets workout tracker with Starscream-style double progression",
    icon: Dumbbell,
  },
  {
    name: "Workout Programs",
    href: "/test/programs",
    description: "Trackable fitness programs (StrongLifts 5×5, 5/3/1) — enroll, log today's session, engine advances weights",
    icon: Dumbbell,
  },
  {
    name: "Pricing",
    href: "/test/pricing",
    description: "Subscription tier pricing page — Free, Practitioner, Coached, Premium Plus",
    icon: CreditCard,
  },
  {
    name: "New New Goals",
    href: "/test/new-goals",
    description: "Redesigned goal framework: Identity → Pillars → Objectives → Targets with auto-milestones",
    icon: Target,
  },
  {
    name: "Life Direction Intensive",
    href: "/test/life-direction",
    description: "Six gated sessions, about nine hours: baseline + constraints → reflect → direction (three scored futures, ranked values, fear-setting) → converge (dream dump, hour budget) → goals in twelve fields behind an 80% realism floor → install (ideal week, fit test, loops, accountability, prototype)",
    icon: Signpost,
  },
  {
    name: "Goal review — what is unclear",
    href: "/test/goal-review",
    description: "Every goal that contradicts itself, and one decision each: a counter that can only reach one, a goal filed under no part of your life, a rate that completes itself. Proposes and never changes — there is deliberately no accept-all",
    icon: Telescope,
  },
  {
    name: "Life Mastery (North Star) — CANON",
    href: "/test/life-mastery",
    description: "The canonical life-planning flow, and the only one not in Archives. Thirteen steps, all reachable at any time: north star and values → your 10 and rating in each of the twelve areas → the one thing → the fork (want / will do / one routine) → templates, custom weeks, systems, experiences → focus, values, commit → track (pushes into real goals) → today",
    icon: Telescope,
  },
  {
    name: "Life Mastery (12 areas, v1)",
    href: "/test/life-mastery-v1",
    description: "The earlier three-step flow, kept for comparison: vision ladder → 12 editable areas you type goals into → a why under every goal",
    icon: Telescope,
  },
  {
    name: "Life Mastery (full lab)",
    href: "/test/vision-plan",
    description: "Whole-life goal system: vision → life areas → goals with horizons, morning ritual, RPM daily musts, weekly evaluation + monthly report",
    icon: Telescope,
  },
  {
    name: "Test Chatbot",
    href: "/test/test-chatbot",
    description: "AI Coach replica that retrieves from the isolated embeddings_test table (Ollama, premium-gated)",
    icon: HelpCircle,
  },
  {
    name: "Change Your Life — research",
    href: "/test/change-your-life",
    description: "91 transcripts and 1,822 comments across 474M views: what the genre skips, where creators contradict each other, and the full ranked corpus",
    icon: FileSearch,
  },
  {
    name: "Change Your Life — the ladder",
    href: "/test/change-your-life/start",
    description: "The actual offering: two questions, then one rung a day. Rungs are supplied, misses never reset, and the letter surfaces on the second miss",
    icon: Waypoints,
  },
  {
    name: "Change Your Life — nine-stage design study",
    href: "/test/change-your-life/flow",
    description: "The full flow the research argues for. Kept as a reference — too much setup to be the product, but the refusals in it are the interesting part",
    icon: ListChecks,
  },
  {
    name: "Change Your Life — short script",
    href: "/test/change-your-life/short",
    description: "The 3-minute vertical, beat by beat: every line with the visual under it, plus the plain transcript",
    icon: Clapperboard,
  },
  {
    name: "Quitting a vice",
    href: "/test/quit-vice",
    description: "Four flows built on four positions the research disagrees about: watch it first (expected vs actual payoff), a negotiated bounded experiment with a daily task, one unconditional line, or pure environment design — plus an urge tool, a lapse debrief and a card that work with no setup. No streak counter anywhere, on purpose",
    icon: Waves,
  },
  {
    name: "Goal setup wizard (the old onboarding)",
    href: "/test/archive/goal-setup",
    description: "What every new account used to land in, before Life Mastery took the job at /dashboard/goals/plan: three paths (fast track / build your own / browse), the catalogue, the driven tour, the summary. Still live — it writes real goals to your account and returns to the archived hub",
    icon: Aperture,
  },
  {
    name: "The Lair (the widget board)",
    href: "/test/archive/lair",
    description: "The configurable widget board that was at /lair, with Mission Control — its own goals surface — inside it. Still live: the board saves, and Mission Control reads and writes real goals. Kept to look at before it goes",
    icon: Castle,
  },
  {
    name: "Goals hub (the old goals tab)",
    href: "/test/archive/goals-hub",
    description: "The whole hub as it was on /dashboard/goals until the plan flow replaced it: every goal by life area, the tree and kanban views, progress, streaks, the catalogue picker, the goal form. Still live — it reads and writes your real goals. Kept to inspect and cherry-pick from, then delete",
    icon: Aperture,
  },
  {
    name: "Toggl-style time tracker",
    href: "/test/toggl",
    description: "Full Toggl Track clone: timer + favourites + shortcuts, calendar view with Google Calendar import, four report types, project dashboards with forecasts, team, approvals, Pomodoro & idle detection",
    icon: Clock,
  },
]

/**
 * WHAT THE ARCHIVE TAB HOLDS.
 *
 * Every earlier attempt at the same problem the North Star flow now owns:
 * turning a life into areas, areas into goals, and goals into something you
 * do on a Tuesday. They are kept reachable rather than deleted, because each
 * one is the record of a decision — but none of them is canon, and nothing
 * new should be built on them or copied out of them without saying so.
 *
 * /test/life-mastery is the canon and is deliberately NOT in this list.
 *
 * Moving a page between the two tabs is one line here. Nothing else reads it.
 */
const ARCHIVED_HREFS = new Set<string>([
  // The life-mastery lineage proper — the same flow, earlier
  "/test/life-mastery-v1",
  "/test/vision-plan",
  "/test/life-direction",
  // Goal-framework attempts the North Star flow absorbed
  "/test/new-goals",
  "/test/goal-model",
  "/test/goal-scorecard",
  "/test/goalsv11",
  "/test/old-variants",
  // The onboarding and the hub Life Mastery replaced in the product
  "/test/archive/goal-setup",
  "/test/archive/goals-hub",
  "/test/archive/lair",
  // Pieces of those flows, explored on their own
  "/test/values-curation",
  "/test/curve-customization",
  "/test/curve_editor",
  "/test/direction-colors",
  "/test/tour-variants",
])

const ARCHIVE_NOTE =
  "Earlier attempts at the flow that now lives at /test/life-mastery. Kept for the record and for the decisions inside them. None of these is canon: don't build on one, and don't copy a life-area list, a goal shape or a curve out of one without checking it against the canon first."


export default function TestPagesIndex() {
  const [tab, setTab] = useState<"current" | "archive">("current")
  const current = testPages.filter((p) => !ARCHIVED_HREFS.has(p.href))
  const archived = testPages.filter((p) => ARCHIVED_HREFS.has(p.href))
  const shown = tab === "current" ? current : archived

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link href="/dashboard">
              <ArrowLeft className="size-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Beaker className="size-8 text-primary" />
            <h1 className="text-3xl font-bold">Test Pages</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Development testing pages for various components and features.
          </p>
        </div>

        {/* Current / Archives. Two tabs rather than two pages, so the archive
            is one click from the thing that replaced it. */}
        <div className="mb-6 flex items-center gap-2 border-b border-border">
          {([
            { id: "current" as const, label: "Current", count: current.length, Icon: Beaker },
            { id: "archive" as const, label: "Archives", count: archived.length, Icon: Archive },
          ]).map(({ id, label, count, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors ${
                tab === id
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {label}
              <span className="text-xs text-muted-foreground">{count}</span>
            </button>
          ))}
        </div>

        {tab === "archive" && (
          <p className="mb-6 rounded-lg border border-border bg-card/50 p-4 text-sm text-muted-foreground">
            {ARCHIVE_NOTE}
          </p>
        )}

        {/* Test Pages Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((page) => {
            const Icon = page.icon
            return (
              <Link
                key={page.href}
                href={page.href}
                className="group flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary hover:bg-card/80"
              >
                <div className="rounded-md bg-primary/10 p-2 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="size-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {page.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{page.description}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
