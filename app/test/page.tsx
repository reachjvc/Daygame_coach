"use client"

import Link from "next/link"
import { ArrowLeft, Beaker, BookOpen, Medal, Sparkles, User, Video, BarChart3, Wand2, Zap, PenTool, Crosshair, LayoutGrid, Archive, ImageIcon, Eye, Palette, Target, Layers, Star, Globe, Play, Rocket, Brain, FlaskConical } from "lucide-react"
import { Button } from "@/components/ui/button"

const testPages = [
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
    name: "Key Stats",
    href: "/test/key-stats",
    description: "Key stats section variations (Original, Enhanced, Creative)",
    icon: BarChart3,
  },
  {
    name: "Expand Effects",
    href: "/test/key-stats-effects",
    description: "5 creative expand animation effects comparison",
    icon: Wand2,
  },
  {
    name: "Ultra-Short Reports",
    href: "/test/ultra-short-reports",
    description: "5 ultra-short field report templates (click Quick Log to see popup)",
    icon: Zap,
  },
  {
    name: "Custom Report Builder",
    href: "/test/custom-report-builder",
    description: "Build your own field report with custom fields",
    icon: PenTool,
  },
  {
    name: "Evaluator Calibration",
    href: "/test/calibration",
    description: "View evaluator diagnostics and identify blind spots",
    icon: Crosshair,
  },
  {
    name: "Goals Views",
    href: "/test/goals-views",
    description: "Compare 4 goal view layouts: Dashboard, Tree, Kanban, List",
    icon: LayoutGrid,
  },
  {
    name: "Old Goals",
    href: "/test/old-goals",
    description: "Original goals hub (archived from Phase 4 transition)",
    icon: Archive,
  },
  {
    name: "Goals Old (Current Hub)",
    href: "/test/goals-old",
    description: "Current production goals hub — daily/strategic views, themes, catalog, celebrations",
    icon: LayoutGrid,
  },
  {
    name: "Archetype Image Picker",
    href: "/test/archetypes",
    description: "Compare existing vs new Scandinavian archetype images — pick winners",
    icon: ImageIcon,
  },
  {
    name: "Icon Differentiation",
    href: "/test/icon-preview",
    description: "Compare current vs proposed icons for 9 overloaded icon issues",
    icon: Eye,
  },
  {
    name: "Curve Customization",
    href: "/test/curve-customization",
    description: "5 visual variations of the curve customizer (Frost, Cyberpunk, Gold, Neon, Zen)",
    icon: Palette,
  },
  {
    name: "Goal Flow Variants",
    href: "/test/goals",
    description: "5 redesigns of goal selection → customization flow (Wizard, Quest, MindMap, Journey, Architect)",
    icon: Target,
  },
  {
    name: "Goal Flow V2",
    href: "/test/goalsv2",
    description: "5 post-customize extensions with curve editor (Forge, Constellation, Momentum, Seasons, War Room)",
    icon: Layers,
  },
  {
    name: "Constellation V3",
    href: "/test/goalsv3",
    description: "5 visual explorations of the Constellation flow (Orrery, Nebula, Bioluminescent, Circuit, Aurora)",
    icon: Star,
  },
  {
    name: "Goal Flow V4",
    href: "/test/goalsv4",
    description: "2 Orrery + 2 Aurora full product builds — interactive goals, animations, Playwright-tested",
    icon: Rocket,
  },
  {
    name: "Goal Flow V5",
    href: "/test/goalsv5",
    description: "10 creative V5 variants — Aurora-Orrery, Living Dashboard, Trophy Room, Neural Pathways + 6 more",
    icon: Sparkles,
  },
  {
    name: "Goal Flow V6",
    href: "/test/goalsv6",
    description: "Streamlined Aurora-Orrery — merged goal selection + target editing into one step, 4-step wizard",
    icon: Sparkles,
  },
  {
    name: "Goal Flow V7",
    href: "/test/goalsv7",
    description: "4 creative variants — improved aurora, enhanced animations, cohesive theming across all steps",
    icon: Sparkles,
  },
  {
    name: "V7 × 2 (threshold test)",
    href: "/test/goalsv7b",
    description: "Same V7 variants A+B in single page (~200K) — tests compilation threshold",
    icon: Sparkles,
  },
  {
    name: "V7 × 3 (threshold test)",
    href: "/test/goalsv7c",
    description: "Same V7 variants A+B+C in single page (~300K) — tests compilation threshold",
    icon: Sparkles,
  },
  {
    name: "V7 × 4 (all variants)",
    href: "/test/goalsv7d",
    description: "All 4 V7 variants A+B+C+D in single page with tab switcher",
    icon: Sparkles,
  },
  {
    name: "5 Goal Philosophies",
    href: "/test/5views_goals",
    description: "5 radically different approaches to goal-setting: Anti-Goals, One Thing, Story Arc, Garden, Contracts",
    icon: Brain,
  },
  {
    name: "Goal Flow V8",
    href: "/test/goalsv8",
    description: "Cosmic Particles base + per-category summary colors from Liquid Void, sorted badge tiers",
    icon: Sparkles,
  },
  {
    name: "Goal Flow V9",
    href: "/test/goalsv9",
    description: "4 visual directions: Living Nebula, Deep Ocean, Aurora Borealis, Cosmic Web — background & orrery focus",
    icon: Sparkles,
  },
  {
    name: "Competitor Sites",
    href: "/test/competitors",
    description: "21 competitor & inspiration sites with screenshots, notes, and recommendations",
    icon: Globe,
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
]

export default function TestPagesIndex() {
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

        {/* Test Pages Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {testPages.map((page) => {
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
