"use client"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import dynamic from "next/dynamic"

const VariantA = dynamic(() => import("../goalsv7/VariantA"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-white/40 text-sm">Loading Variant A...</div>
  ),
})
const VariantB = dynamic(() => import("../goalsv7/VariantB"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-white/40 text-sm">Loading Variant B...</div>
  ),
})
const VariantC = dynamic(() => import("../goalsv7/VariantC"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-white/40 text-sm">Loading Variant C...</div>
  ),
})
const VariantD = dynamic(() => import("../goalsv7/VariantD"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-white/40 text-sm">Loading Variant D...</div>
  ),
})

const VARIANTS = [
  { id: "A", label: "Variant A", component: VariantA },
  { id: "B", label: "Variant B", component: VariantB },
  { id: "C", label: "Variant C", component: VariantC },
  { id: "D", label: "Variant D", component: VariantD },
] as const

export default function GoalsV7dPage() {
  const [activeVariant, setActiveVariant] = useState<string>("A")
  const ActiveComponent = VARIANTS.find((v) => v.id === activeVariant)?.component ?? VariantA

  return (
    <div className="relative">
      <button
        onClick={() => window.history.back()}
        className="fixed top-4 left-4 z-50 flex items-center gap-1.5 rounded-lg bg-background/80 backdrop-blur border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors shadow-lg"
      >
        <ArrowLeft className="size-4" />
        Back
      </button>

      <div className="fixed top-4 right-4 z-50 flex gap-1 rounded-lg bg-black/60 backdrop-blur border border-white/10 p-1">
        {VARIANTS.map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveVariant(v.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeVariant === v.id
                ? "bg-white/20 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <ActiveComponent />
    </div>
  )
}
