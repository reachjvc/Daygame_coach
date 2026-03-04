"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Navigation } from "lucide-react"
import { Button } from "@/components/ui/button"
import dynamic from "next/dynamic"

const VariantA = dynamic(() => import("./VariantA"), { ssr: false })
const VariantB = dynamic(() => import("./VariantB"), { ssr: false })
const VariantC = dynamic(() => import("./VariantC"), { ssr: false })
const VariantD = dynamic(() => import("./VariantD"), { ssr: false })

const variants = [
  { key: "a", label: "A — Strong Site", description: "Linear/Notion-style: clean spotlight overlay, progress bar, smooth transitions, hotkey hints", color: "bg-blue-500" },
  { key: "b", label: "B — Creative", description: "Breaks conventions: aurora-themed, experimental animations, unconventional navigation metaphor", color: "bg-green-500" },
  { key: "c", label: "C — Minimalist", description: "Apple-style: no dark overlay, inline hints, progressive disclosure, micro-animations, barely-there aesthetic", color: "bg-yellow-500" },
  { key: "d", label: "D — Narrative", description: "Storytelling: coaching-style copy explaining WHY each element matters, emotional narrative arc", color: "bg-purple-500" },
]

function VariantChooser({ onSelect }: { onSelect: (key: string) => void }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-8 py-12">
        <div className="mb-8">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link href="/test">
              <ArrowLeft className="size-4 mr-2" />
              Back to Test Pages
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Navigation className="size-8 text-primary" />
            <h1 className="text-3xl font-bold">Tour Variants</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            4 different approaches to the Goals step guided tour. Each covers all 13 tour stops.
          </p>
        </div>

        <div className="grid gap-4">
          {variants.map((v) => (
            <button
              key={v.key}
              onClick={() => onSelect(v.key)}
              className="group flex items-start gap-4 rounded-lg border border-border bg-card p-5 text-left transition-colors hover:border-primary hover:bg-card/80"
            >
              <div className={`${v.color} rounded-md px-3 py-1.5 text-white font-bold text-sm shrink-0`}>
                {v.key.toUpperCase()}
              </div>
              <div>
                <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors text-lg">
                  {v.label}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">{v.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function TourVariantsPageInner() {
  const searchParams = useSearchParams()
  const urlVariant = searchParams.get("variant")
  const [selected, setSelected] = useState<string | null>(urlVariant)

  const handleSelect = (key: string) => {
    setSelected(key)
    window.history.pushState(null, "", `/test/tour-variants?variant=${key}`)
  }

  const handleBack = () => {
    setSelected(null)
    window.history.pushState(null, "", "/test/tour-variants")
  }

  if (!selected) {
    return <VariantChooser onSelect={handleSelect} />
  }

  return (
    <div>
      <div className="fixed top-4 left-4 z-50">
        <Button variant="outline" size="sm" onClick={handleBack} className="bg-background/80 backdrop-blur-sm">
          <ArrowLeft className="size-4 mr-2" />
          All Variants
        </Button>
      </div>
      {selected === "a" && <VariantA />}
      {selected === "b" && <VariantB />}
      {selected === "c" && <VariantC />}
      {selected === "d" && <VariantD />}
    </div>
  )
}

export default function TourVariantsPage() {
  return <Suspense><TourVariantsPageInner /></Suspense>
}
