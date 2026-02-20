"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"

// Lazy-load each variant to keep bundle lean
const VariantA = dynamic(() => import("./VariantA"), { ssr: false })
const VariantD = dynamic(() => import("./VariantD"), { ssr: false })
const VariantF = dynamic(() => import("./VariantF"), { ssr: false })
const VariantG = dynamic(() => import("./VariantG"), { ssr: false })

// ============================================================================
// Variant Registry
// ============================================================================

interface VariantInfo {
  key: string
  label: string
  theme: string
  hierarchy: string
  flow: string
  complexity: string
  description: string
  gradient: string
  batch: 1 | 2
}

const variants: VariantInfo[] = [
  // ---- Batch 1 ----
  {
    key: "a",
    label: "Aurora-Orrery Hybrid",
    theme: "Aurora + Brass",
    hierarchy: "Tree (L1→L2→L3)",
    flow: "Linear Wizard",
    complexity: "LOW",
    description: "Aurora sky landing → goal picker → brass orrery step gauge. The direct mashup.",
    gradient: "from-violet-600 via-cyan-500 to-amber-500",
    batch: 1,
  },
  {
    key: "d",
    label: "Living Dashboard",
    theme: "Aurora + Ghost Data",
    hierarchy: "Flat (L1→L3)",
    flow: "Non-Linear Explorer",
    complexity: "MEDIUM",
    description: "Landing IS the dashboard with ghost data. Tap areas to configure. No fixed steps.",
    gradient: "from-blue-600 via-purple-500 to-pink-500",
    batch: 1,
  },
  {
    key: "f",
    label: "Trophy Room",
    theme: "Aurora + Badges",
    hierarchy: "Flat + Badge Wall",
    flow: "Linear Wizard",
    complexity: "MEDIUM",
    description: "Simplified goal picker (no L2s) + achievement trophy wall. Tests L2 extraction.",
    gradient: "from-amber-500 via-yellow-400 to-orange-500",
    batch: 1,
  },
  {
    key: "g",
    label: "Neural Pathways",
    theme: "Neural Network",
    hierarchy: "Network Graph",
    flow: "Network Activator",
    complexity: "HIGH",
    description: "Abstract neural network. Goals light up pathways. Cross-area connections visible.",
    gradient: "from-emerald-500 via-teal-400 to-cyan-500",
    batch: 1,
  },
  // ---- Batch 2 (placeholders) ----
  {
    key: "b",
    label: "Aurora-Circuit Fusion",
    theme: "Aurora + PCB",
    hierarchy: "Tree",
    flow: "Linear Wizard",
    complexity: "MEDIUM",
    description: "Aurora sky with circuit board grid. Goals as processor chips with data flow lines.",
    gradient: "from-green-500 via-emerald-400 to-cyan-500",
    batch: 2,
  },
  {
    key: "c",
    label: "Theme Journey",
    theme: "Multi-Theme Crossfade",
    hierarchy: "Tree",
    flow: "Linear Wizard",
    complexity: "HIGH",
    description: "Each step has a different visual world. Aurora → Circuit → Forge → Constellation → Brass.",
    gradient: "from-red-500 via-orange-400 to-yellow-500",
    batch: 2,
  },
  {
    key: "e",
    label: "Signal Flow",
    theme: "Circuit + Gamification",
    hierarchy: "Flat + Signal Processors",
    flow: "Linear Wizard",
    complexity: "HIGH",
    description: "CPU chip landing. Goals as signal nodes with real-time data flow. XP preview system.",
    gradient: "from-blue-500 via-indigo-400 to-violet-500",
    batch: 2,
  },
  {
    key: "h",
    label: "Expedition Map",
    theme: "Cartography",
    hierarchy: "Tree",
    flow: "Discovery Fork",
    complexity: "HIGH",
    description: "Parchment map with fog of war. Picking goals reveals terrain. Landmarks as achievements.",
    gradient: "from-amber-700 via-yellow-600 to-lime-500",
    batch: 2,
  },
  {
    key: "i",
    label: "Command Deck",
    theme: "Space Ops",
    hierarchy: "Flat + Certifications",
    flow: "Area-First, Fork Inside",
    complexity: "MEDIUM",
    description: "Ship bridge overview. Life areas as ship systems. Launch readiness meter.",
    gradient: "from-slate-600 via-blue-500 to-cyan-400",
    batch: 2,
  },
  {
    key: "j",
    label: "Seasons / Growth",
    theme: "Organic Garden",
    hierarchy: "Tree",
    flow: "Discovery Fork",
    complexity: "MEDIUM",
    description: "Garden with seasonal cycle. Goals as seeds → sprouts → plants → fruit.",
    gradient: "from-green-600 via-lime-400 to-yellow-400",
    batch: 2,
  },
]

// ============================================================================
// Variant Chooser Grid
// ============================================================================

function VariantCard({ v, onClick }: { v: VariantInfo; onClick: () => void }) {
  const isBuilt = v.batch === 1
  return (
    <button
      onClick={onClick}
      disabled={!isBuilt}
      className={`group relative flex flex-col gap-3 rounded-xl border p-5 text-left transition-all
        ${isBuilt
          ? "border-border bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
          : "border-border/50 bg-card/50 opacity-60 cursor-not-allowed"
        }`}
    >
      {/* Gradient bar */}
      <div className={`h-1 w-full rounded-full bg-gradient-to-r ${v.gradient} ${!isBuilt ? "opacity-40" : ""}`} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Variant {v.key.toUpperCase()}
          </span>
          {!isBuilt && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              Batch 2
            </span>
          )}
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium
          ${v.complexity === "LOW" ? "bg-green-500/10 text-green-500"
            : v.complexity === "MEDIUM" ? "bg-yellow-500/10 text-yellow-500"
            : "bg-red-500/10 text-red-500"}`}
        >
          {v.complexity}
        </span>
      </div>

      {/* Title + description */}
      <div>
        <h3 className={`font-semibold text-lg ${isBuilt ? "group-hover:text-primary" : ""} transition-colors`}>
          {v.label}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{v.description}</p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mt-auto">
        {[v.theme, v.hierarchy, v.flow].map((tag) => (
          <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>
    </button>
  )
}

function VariantChooser({ onSelect }: { onSelect: (key: string) => void }) {
  const batch1 = variants.filter((v) => v.batch === 1)
  const batch2 = variants.filter((v) => v.batch === 2)

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-8 py-12">
        {/* Header */}
        <div className="mb-10">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link href="/test">
              <ArrowLeft className="size-4 mr-2" />
              Back to Test Pages
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Sparkles className="size-8 text-primary" />
            <h1 className="text-3xl font-bold">V5 Goal Setup Variants</h1>
          </div>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            10 creative redesigns exploring different hierarchies, flows, and visual themes.
            Batch 1 (4 variants) built first for fast feedback.
          </p>
        </div>

        {/* Batch 1 */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            Batch 1 — Maximum Spread
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">4 variants</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {batch1.map((v) => (
              <VariantCard key={v.key} v={v} onClick={() => onSelect(v.key)} />
            ))}
          </div>
        </div>

        {/* Batch 2 */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            Batch 2 — Informed by Feedback
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">6 variants</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batch2.map((v) => (
              <VariantCard key={v.key} v={v} onClick={() => onSelect(v.key)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Page Component
// ============================================================================

const VARIANT_COMPONENTS: Record<string, React.ComponentType> = {
  a: VariantA,
  d: VariantD,
  f: VariantF,
  g: VariantG,
}

export default function GoalsV5Page() {
  const searchParams = useSearchParams()
  const urlVariant = searchParams.get("variant")
  const [selected, setSelected] = useState<string | null>(urlVariant)

  const handleSelect = (key: string) => {
    setSelected(key)
    window.history.pushState(null, "", `/test/goalsv5?variant=${key}`)
  }

  const handleBack = () => {
    setSelected(null)
    window.history.pushState(null, "", "/test/goalsv5")
  }

  if (!selected) return <VariantChooser onSelect={handleSelect} />

  const VariantComponent = VARIANT_COMPONENTS[selected]
  if (!VariantComponent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-4">Variant {selected.toUpperCase()} not built yet (Batch 2)</p>
          <Button onClick={handleBack} variant="outline">Back to Grid</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Floating back button */}
      <button
        onClick={handleBack}
        className="fixed top-4 left-4 z-50 flex items-center gap-1.5 rounded-lg bg-background/80 backdrop-blur border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors shadow-lg"
      >
        <ArrowLeft className="size-4" />
        All Variants
      </button>
      <VariantComponent />
    </div>
  )
}
