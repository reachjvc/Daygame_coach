"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import VariantF from "./VariantF"
import VariantG from "./VariantG"
import VariantH from "./VariantH"
import VariantI from "./VariantI"
import VariantJ from "./VariantJ"

const VARIANTS = [
  { id: "f", label: "The Forge", description: "Multi-curve category shaping — forge your growth blueprint" },
  { id: "g", label: "Constellation", description: "Star map goal visualization — chart your stars" },
  { id: "h", label: "Momentum", description: "Physics-inspired momentum builder — zen & cyberpunk themes" },
  { id: "i", label: "Seasons", description: "Seasonal journey planner — spring to winter growth arc" },
  { id: "j", label: "War Room", description: "Strategic campaign planning — zen & cyberpunk themes" },
] as const

type VariantId = (typeof VARIANTS)[number]["id"]

export default function GoalsV2TestPage() {
  const [activeVariant, setActiveVariant] = useState<VariantId>("f")

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
            <Layers className="size-7 text-primary" />
            <h1 className="text-2xl font-bold">Goal Flow V2 — Post-Customize Variants</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            5 creative extensions of the winning A+D flow. All include the customizable curve editor.
            Variants H and J feature zen/cyberpunk theme switching.
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
          {activeVariant === "f" && <VariantF />}
          {activeVariant === "g" && <VariantG />}
          {activeVariant === "h" && <VariantH />}
          {activeVariant === "i" && <VariantI />}
          {activeVariant === "j" && <VariantJ />}
        </div>
      </div>
    </div>
  )
}
