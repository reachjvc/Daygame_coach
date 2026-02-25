"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { VariantA } from "./VariantA"
import { VariantB } from "./VariantB"
import { VariantC } from "./VariantC"

const VARIANTS = [
  { id: "a", label: "A — Neon Wireframe", description: "No-fill cards, thin neon borders, blueprint HUD feel" },
  { id: "b", label: "B — Warm Gradients", description: "Solid opaque gradient backgrounds, Spotify/Linear dark theme" },
  { id: "c", label: "C — Mono + Color Pop", description: "All grayscale until selected, then color explodes" },
] as const

export default function DirectionColorsTestPage() {
  const [active, setActive] = useState<"a" | "b" | "c">("a")

  return (
    <div className="min-h-screen" style={{ background: "#09090b" }}>
      {/* Tab bar */}
      <div className="sticky top-0 z-50 border-b border-white/10" style={{ background: "rgba(9,9,11,0.9)", backdropFilter: "blur(12px)" }}>
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center gap-4 mb-3">
            <Link href="/test" className="text-white/40 hover:text-white/70 transition-colors">
              <ArrowLeft className="size-4" />
            </Link>
            <h1 className="text-sm font-semibold text-white/70">Direction Step — Color Schemes</h1>
          </div>
          <div className="flex gap-2">
            {VARIANTS.map((v) => (
              <button
                key={v.id}
                onClick={() => setActive(v.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: active === v.id ? "rgba(249,115,22,0.2)" : "transparent",
                  border: active === v.id ? "1px solid rgba(249,115,22,0.5)" : "1px solid transparent",
                  color: active === v.id ? "#f97316" : "rgba(255,255,255,0.4)",
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-white/25 mt-1.5">
            {VARIANTS.find((v) => v.id === active)?.description}
          </p>
        </div>
      </div>

      {/* Variant content */}
      {active === "a" && <VariantA />}
      {active === "b" && <VariantB />}
      {active === "c" && <VariantC />}
    </div>
  )
}
