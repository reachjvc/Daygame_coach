"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCurveDemo } from "./_components/useCurveDemo"
import VariantFrost from "./_components/VariantFrost"
import VariantCyberpunk from "./_components/VariantCyberpunk"
import VariantGold from "./_components/VariantGold"
import VariantNeon from "./_components/VariantNeon"
import VariantZen from "./_components/VariantZen"

const VARIANTS = [
  { id: "frost", label: "Frost", description: "Glassmorphism — frosted glass, indigo-violet" },
  { id: "cyberpunk", label: "Cyberpunk", description: "Hyper-futuristic — black & red, sharp, monospace" },
  { id: "gold", label: "Gold", description: "Premium — dark slate, warm gold, luxury fintech" },
  { id: "neon", label: "Neon", description: "Gradient — deep purple, cyan-to-magenta, vibrant" },
  { id: "zen", label: "Zen", description: "Minimal — light mode, teal accent, ultra-clean" },
] as const

type VariantId = (typeof VARIANTS)[number]["id"]

export default function CurveCustomizationTestPage() {
  const [activeVariant, setActiveVariant] = useState<VariantId>("frost")
  const demo = useCurveDemo()

  const current = VARIANTS.find((v) => v.id === activeVariant)!

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-10">
        {/* Header */}
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="mb-3">
            <Link href="/test">
              <ArrowLeft className="size-4 mr-2" />
              Back to Test Pages
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Palette className="size-7 text-primary" />
            <h1 className="text-2xl font-bold">Curve Customizer Variations</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            5 visual treatments of the same curve customizer. Compare styles, pick elements you like.
          </p>
        </div>

        {/* Variant tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg bg-muted/50 overflow-x-auto">
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
        <p className="text-xs text-muted-foreground mb-4">{current.description}</p>

        {/* Active variant */}
        <div className="rounded-xl overflow-hidden">
          {activeVariant === "frost" && <VariantFrost demo={demo} />}
          {activeVariant === "cyberpunk" && <VariantCyberpunk demo={demo} />}
          {activeVariant === "gold" && <VariantGold demo={demo} />}
          {activeVariant === "neon" && <VariantNeon demo={demo} />}
          {activeVariant === "zen" && <VariantZen demo={demo} />}
        </div>
      </div>
    </div>
  )
}
