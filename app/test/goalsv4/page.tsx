"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { ArrowLeft, Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"

const VariantA = dynamic(() => import("./VariantA"), {
  loading: () => <div className="p-8 text-muted-foreground">Loading Orrery Alpha...</div>,
  ssr: false,
})
const VariantB = dynamic(() => import("./VariantB"), {
  loading: () => <div className="p-8 text-muted-foreground">Loading Orrery Beta...</div>,
  ssr: false,
})
const VariantC = dynamic(() => import("./VariantC"), {
  loading: () => <div className="p-8 text-muted-foreground">Loading Aurora Alpha...</div>,
  ssr: false,
})
const VariantD = dynamic(() => import("./VariantD"), {
  loading: () => <div className="p-8 text-muted-foreground">Loading Aurora Beta...</div>,
  ssr: false,
})

const VARIANTS = [
  { id: "a", label: "Orrery Alpha", description: "Fully functional mechanical orrery — interactive orbital controls, goal management, and progress tracking" },
  { id: "b", label: "Orrery Beta", description: "Evolved orrery system — enhanced planetary mechanics, real-time animations, and deep customization" },
  { id: "c", label: "Aurora Alpha", description: "Fully functional aurora borealis — interactive light ribbons, atmospheric goal tracking, and seasonal flow" },
  { id: "d", label: "Aurora Beta", description: "Evolved aurora system — enhanced particle physics, magnetic field interactions, and immersive visualization" },
] as const

type VariantId = (typeof VARIANTS)[number]["id"]

export default function GoalsV4TestPage() {
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
            <Rocket className="size-7 text-primary" />
            <h1 className="text-2xl font-bold">Goal Flow V4 — Full Product Builds</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            2 Orrery + 2 Aurora variants, each built as a fully functional product.
            Interactive goal management, real animations, and complete user flows.
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
        </div>
      </div>
    </div>
  )
}
