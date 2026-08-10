"use client"

/**
 * Two readings of the same study, because they have incompatible jobs.
 *
 *  - **Showcase** is filmed. It gets scrolled through inside the short, so it is
 *    graphical, expansive, and carries no creator names or attributed quotes.
 *  - **Deep dive** is the working record: named sources, quotes with their like
 *    counts, all 93 videos, and the caveats.
 *
 * The split is deliberate rather than cosmetic. Copy that reads well in a
 * document — dense, clipped, heavy with attribution — is unreadable at scroll
 * speed, and a quote with a channel name attached becomes a callout of a
 * specific person the moment it is on camera.
 */

import { useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

import { DeepDiveView } from "./DeepDiveView"
import { LabHeader } from "./shared"
import { ShowcaseView } from "./ShowcaseView"

type Tab = "showcase" | "deep"

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "showcase", label: "The findings", hint: "Built to be filmed — scroll this one on camera" },
  { id: "deep", label: "Behind it", hint: "Sources, quotes, all 93 videos, and the caveats" },
]

export function ResearchDashboard() {
  const [tab, setTab] = useState<Tab>("showcase")
  const active = TABS.find((t) => t.id === tab)!

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-8">
        <LabHeader
          eyebrow="Corpus study · 9 August 2026"
          title="What 91 “change your life” videos won’t tell you"
          blurb="Every one of them diagnoses the problem well. Almost none says what to do on Monday. So the audience built the missing product itself — in the comment boxes."
        >
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/test/change-your-life/flow">Open the prototype flow</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/test/change-your-life/short">Read the short’s script</Link>
            </Button>
          </div>
        </LabHeader>

        <div className="mb-8 border-b border-border">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mb-8 text-xs text-muted-foreground">{active.hint}</p>

        {tab === "showcase" ? <ShowcaseView /> : <DeepDiveView />}
      </div>
    </div>
  )
}
