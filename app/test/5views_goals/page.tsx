"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { ArrowLeft, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"

const VariantA = dynamic(() => import("./VariantA"), {
  loading: () => <div className="p-8 text-muted-foreground">Loading Anti-Goals...</div>,
  ssr: false,
})
const VariantB = dynamic(() => import("./VariantB"), {
  loading: () => <div className="p-8 text-muted-foreground">Loading One Thing...</div>,
  ssr: false,
})
const VariantC = dynamic(() => import("./VariantC"), {
  loading: () => <div className="p-8 text-muted-foreground">Loading Story Arc...</div>,
  ssr: false,
})
const VariantD = dynamic(() => import("./VariantD"), {
  loading: () => <div className="p-8 text-muted-foreground">Loading Garden...</div>,
  ssr: false,
})
const VariantE = dynamic(() => import("./VariantE"), {
  loading: () => <div className="p-8 text-muted-foreground">Loading Contracts...</div>,
  ssr: false,
})

const VARIANTS = [
  { id: "a", label: "Anti-Goals", description: "Fear-driven goal-setting — define who you DON'T want to be, derive actions from avoidance identities" },
  { id: "b", label: "One Thing", description: "Radical focus — one active goal at a time, everything else is blocked until done or consciously abandoned" },
  { id: "c", label: "Story Arc", description: "Narrative goal-setting — you're the protagonist, goals are chapters, setbacks are plot twists" },
  { id: "d", label: "Garden", description: "Ecosystem approach — plant seeds, water them, watch cross-pollination, accept that some things die" },
  { id: "e", label: "Contracts", description: "Adversarial commitment devices — pre-commit with stakes, the system actively tries to catch you failing" },
] as const

type VariantId = (typeof VARIANTS)[number]["id"]

export default function FiveViewsGoalsPage() {
  const [activeVariant, setActiveVariant] = useState<VariantId>("a")

  const current = VARIANTS.find((v) => v.id === activeVariant)!

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="mb-3">
            <Link href="/test">
              <ArrowLeft className="size-4 mr-2" />
              Back to Test Pages
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Brain className="size-7 text-primary" />
            <h1 className="text-2xl font-bold">5 Goal-Setting Philosophies</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Each variant reimagines the fundamental approach to goal-setting, not just the UI.
          </p>
        </div>

        {/* Variant tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-lg bg-muted/50 overflow-x-auto">
          {VARIANTS.map((v) => (
            <button
              key={v.id}
              onClick={() => setActiveVariant(v.id)}
              className={`flex-1 min-w-0 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                activeVariant === v.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Variant description */}
        <p className="text-xs text-muted-foreground mb-6">{current.description}</p>

        {/* Active variant */}
        <div>
          {activeVariant === "a" && <VariantA />}
          {activeVariant === "b" && <VariantB />}
          {activeVariant === "c" && <VariantC />}
          {activeVariant === "d" && <VariantD />}
          {activeVariant === "e" && <VariantE />}
        </div>
      </div>
    </div>
  )
}
