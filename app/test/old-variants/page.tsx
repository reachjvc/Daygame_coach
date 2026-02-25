"use client"

import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const variants = [
  {
    version: "V1",
    href: "/test/goals",
    description: "5 redesigns of goal selection → customization flow (Wizard, Quest, MindMap, Journey, Architect)",
  },
  {
    version: "V2",
    href: "/test/goalsv2",
    description: "5 post-customize extensions with curve editor (Forge, Constellation, Momentum, Seasons, War Room)",
  },
  {
    version: "V3",
    href: "/test/goalsv3",
    description: "5 visual explorations of the Constellation flow (Orrery, Nebula, Bioluminescent, Circuit, Aurora)",
  },
  {
    version: "V4",
    href: "/test/goalsv4",
    description: "2 Orrery + 2 Aurora full product builds — interactive goals, animations, Playwright-tested",
  },
  {
    version: "V5",
    href: "/test/goalsv5",
    description: "10 creative variants — Aurora-Orrery, Living Dashboard, Trophy Room, Neural Pathways + 6 more",
  },
  {
    version: "V6",
    href: "/test/goalsv6",
    description: "Streamlined Aurora-Orrery — merged goal selection + target editing into one step, 4-step wizard",
  },
  {
    version: "V7",
    href: "/test/goalsv7",
    description: "4 creative variants — improved aurora, enhanced animations, cohesive theming across all steps",
  },
  {
    version: "V8",
    href: "/test/goalsv8",
    description: "Cosmic Particles base + per-category summary colors from Liquid Void, sorted badge tiers",
  },
  {
    version: "V9",
    href: "/test/goalsv9",
    description: "4 visual directions: Living Nebula, Deep Ocean, Aurora Borealis, Cosmic Web — background & orrery focus",
  },
]

export default function OldVariantsIndex() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-8 py-12">
        <div className="mb-8">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link href="/test">
              <ArrowLeft className="size-4 mr-2" />
              Back to Test Pages
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Sparkles className="size-8 text-primary" />
            <h1 className="text-3xl font-bold">Goal Flow Variants</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Historical goal setup flow explorations (V1–V9).
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {variants.map((v) => (
            <Link
              key={v.href}
              href={v.href}
              className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary hover:bg-card/80"
            >
              <span className="shrink-0 rounded-md bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {v.version}
              </span>
              <p className="text-sm text-muted-foreground">{v.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
