"use client"

import Link from "next/link"
import { ArrowLeft, Goal, MountainSnow, Waypoints, SignpostBig, Gem, Diamond, Navigation2, Landmark, FlagTriangleRight, Aperture } from "lucide-react"
import { GoalIcon } from "@/components/ui/GoalIcon"
import type { ComponentType, SVGProps } from "react"
import type { LucideProps } from "lucide-react"

type IconEntry = {
  name: string
  icon: ComponentType<LucideProps> | ComponentType<SVGProps<SVGSVGElement>>
  concept: string
  isCurrent?: boolean
}

const icons: IconEntry[] = [
  { name: "GoalIcon (current)", icon: GoalIcon, concept: "Custom flowing flag", isCurrent: true },
  { name: "Goal", icon: Goal, concept: "Net / target" },
  { name: "MountainSnow", icon: MountainSnow, concept: "Summit aspiration" },
  { name: "Waypoints", icon: Waypoints, concept: "Path with checkpoints" },
  { name: "SignpostBig", icon: SignpostBig, concept: "Direction indicator" },
  { name: "Gem", icon: Gem, concept: "Precious / refined" },
  { name: "Diamond", icon: Diamond, concept: "Polished achievement" },
  { name: "Navigation2", icon: Navigation2, concept: "Direction arrow" },
  { name: "Landmark", icon: Landmark, concept: "Significant marker" },
  { name: "FlagTriangleRight", icon: FlagTriangleRight, concept: "Forward flag" },
  { name: "Aperture", icon: Aperture, concept: "Focused precision" },
]

const sizes = [
  { label: "16px", className: "size-4" },
  { label: "24px", className: "size-6" },
  { label: "40px", className: "size-10" },
]

export default function GoalIconCandidatesPage() {
  return (
    <div className="min-h-screen">
      {/* Light section */}
      <div className="bg-background px-8 py-12">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/test"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="size-4" />
            Back to Test Pages
          </Link>

          <h1 className="text-3xl font-bold mb-2">Goal Icon Candidates</h1>
          <p className="text-muted-foreground mb-8">
            Current custom flag vs 10 unused lucide-react alternatives. Shown at 16px, 24px, and 40px.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {icons.map((entry) => {
              const Icon = entry.icon
              return (
                <div
                  key={entry.name}
                  className={`rounded-lg border p-4 flex flex-col items-center gap-3 ${
                    entry.isCurrent
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-end gap-4">
                    {sizes.map((s) => (
                      <Icon key={s.label} className={`${s.className} text-foreground`} />
                    ))}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">{entry.name}</p>
                    <p className="text-xs text-muted-foreground">{entry.concept}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Dark section */}
      <div className="bg-zinc-950 text-zinc-100 px-8 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-xl font-semibold mb-6 text-zinc-100">Dark Background Preview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {icons.map((entry) => {
              const Icon = entry.icon
              return (
                <div
                  key={entry.name}
                  className={`rounded-lg border p-4 flex flex-col items-center gap-3 ${
                    entry.isCurrent
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-zinc-800 bg-zinc-900"
                  }`}
                >
                  <div className="flex items-end gap-4">
                    {sizes.map((s) => (
                      <Icon key={s.label} className={`${s.className} text-zinc-100`} />
                    ))}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-zinc-100">{entry.name}</p>
                    <p className="text-xs text-zinc-400">{entry.concept}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
