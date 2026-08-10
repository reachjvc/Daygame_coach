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
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"

import { DeepDiveView } from "./DeepDiveView"
import { ShowcaseView } from "./ShowcaseView"

type Tab = "showcase" | "deep"

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "showcase", label: "The findings", hint: "Scroll this one on camera. It reads as a 3-minute script." },
  { id: "deep", label: "Behind it", hint: "Sources, quotes, all 93 videos, the caveats." },
]

export function ResearchDashboard() {
  const [tab, setTab] = useState<Tab>("showcase")
  const active = TABS.find((t) => t.id === tab)!

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-8">
        {/* Page furniture stays small on purpose: the showcase tab gets filmed,
            and its own opening line has to be the first thing in frame. */}
        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <Link href="/test">
              <ArrowLeft className="mr-2 size-4" />
              Test pages
            </Link>
          </Button>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Change your life · corpus study
          </span>
          <div className="ml-auto flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/test/change-your-life/flow">Prototype flow</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/test/change-your-life/short">Short script</Link>
            </Button>
          </div>
        </div>

        <div className="mb-8 flex items-end justify-between gap-4 border-b border-border">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="hidden pb-2 text-xs text-muted-foreground sm:block">{active.hint}</p>
        </div>

        {tab === "showcase" ? <ShowcaseView /> : <DeepDiveView />}
      </div>
    </div>
  )
}
