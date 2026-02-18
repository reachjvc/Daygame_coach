"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import VariantA from "./VariantA"
import VariantB from "./VariantB"
import VariantC from "./VariantC"
import VariantD from "./VariantD"
import VariantE from "./VariantE"

const VARIANTS = [
  { id: "a", label: "Orrery", description: "Mechanical solar system — orbiting planets, brass gears, clockwork feel" },
  { id: "b", label: "Nebula", description: "Deep space nebula — gas clouds, particle fields, cosmic scale" },
  { id: "c", label: "Bioluminescent", description: "Deep ocean — glowing jellyfish, bioluminescent nodes, organic movement" },
  { id: "d", label: "Circuit", description: "Neural network — data pulses, circuit traces, living motherboard" },
  { id: "e", label: "Aurora", description: "Northern lights — flowing ribbons, magnetic field lines, atmospheric glow" },
] as const

type VariantId = (typeof VARIANTS)[number]["id"]

export default function GoalsV3TestPage() {
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
            <Star className="size-7 text-primary" />
            <h1 className="text-2xl font-bold">Constellation V3 — Visual Explorations</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            5 creative interpretations of the Constellation goal flow.
            Each treats life areas as worlds in a larger system. Daygame is just one planet.
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
