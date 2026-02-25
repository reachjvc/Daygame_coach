"use client"

import { useState } from "react"
import { Sparkles, Heart, Crown, Dumbbell, Briefcase, Brain, Cigarette, ChevronRight, Check, Star } from "lucide-react"

const PATHS = [
  { id: "fto", label: "Find The One", desc: "Connection & commitment", icon: Star, accent: "#f97068",
    bg: "linear-gradient(135deg, #2d1b1b, #3d1f1f)", bgSel: "linear-gradient(135deg, #3d2020, #5a2828)" },
  { id: "abundance", label: "Abundance", desc: "Freedom & experience", icon: Crown, accent: "#c084fc",
    bg: "linear-gradient(135deg, #1b1a2d, #2a1f3d)", bgSel: "linear-gradient(135deg, #2a2040, #3d2860)" },
] as const

const REASONS = ["Get a girlfriend", "Find my dream girl", "Get engaged", "Be in a fulfilling relationship"]

const LIFE_AREAS = [
  { id: "health", label: "Health", desc: "Body & fitness", icon: Dumbbell, accent: "#4ade80",
    bg: "linear-gradient(135deg, #0f2a1a, #1a3d2a)", bgSel: "linear-gradient(135deg, #163d24, #235a38)" },
  { id: "career", label: "Career", desc: "Work & ambition", icon: Briefcase, accent: "#60a5fa",
    bg: "linear-gradient(135deg, #151a30, #1f2645)", bgSel: "linear-gradient(135deg, #1c2540, #2a3560)" },
  { id: "growth", label: "Personal Growth", desc: "Mind & skills", icon: Brain, accent: "#fbbf24",
    bg: "linear-gradient(135deg, #2a2010, #3d301a)", bgSel: "linear-gradient(135deg, #3d3018, #5a4525)" },
  { id: "vices", label: "Vices", desc: "Habits to break", icon: Cigarette, accent: "#f87171",
    bg: "linear-gradient(135deg, #2a1010, #3d1a1a)", bgSel: "linear-gradient(135deg, #3d1818, #5a2525)" },
]

export function VariantB() {
  const [selectedPath, setSelectedPath] = useState<"fto" | "abundance" | null>(null)
  const [selectedReasons, setSelectedReasons] = useState<Set<string>>(new Set())
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set())

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set); next.has(key) ? next.delete(key) : next.add(key); return next
  }

  const activePath = PATHS.find((p) => p.id === selectedPath)

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto flex flex-col gap-5" style={{ background: "#111118" }}>
      {/* Heading */}
      <div className="flex items-center gap-3 mb-1">
        <Sparkles size={22} style={{ color: "#f59e0b" }} />
        <h1 className="text-xl font-semibold text-white">Shape Your Path to Mastery</h1>
      </div>

      {/* Dating & Daygame header card */}
      <div
        className="rounded-xl px-5 py-4 flex items-center gap-3"
        style={{
          background: "linear-gradient(135deg, #1a1a2e, #16213e)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Heart size={20} style={{ color: "#f97068" }} />
        <span className="text-sm font-semibold text-white">Dating &amp; Daygame</span>
      </div>

      {/* Path cards side by side */}
      <div className="grid grid-cols-2 gap-3">
        {PATHS.map((p) => {
          const sel = selectedPath === p.id
          const Icon = p.icon
          return (
            <button
              key={p.id}
              onClick={() => setSelectedPath(sel ? null : p.id)}
              className="relative rounded-xl px-4 py-4 text-left transition-all duration-200 overflow-hidden"
              style={{
                background: sel ? p.bgSel : p.bg,
                border: sel ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {sel && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ background: p.accent }} />
              )}
              <Icon size={20} className="mb-2" style={{ color: p.accent }} />
              <div className="text-sm font-semibold text-white">{p.label}</div>
              <div className="text-xs mt-1 text-white/40">{p.desc}</div>
            </button>
          )
        })}
      </div>

      {/* Reasons — shown when path selected */}
      {selectedPath && activePath && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-white/40 mb-1">Your reasons</span>
          {REASONS.map((r) => {
            const sel = selectedReasons.has(r)
            return (
              <button
                key={r}
                onClick={() => setSelectedReasons((prev) => toggle(prev, r))}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150"
                style={{ background: sel ? `${activePath.accent}12` : "transparent" }}
              >
                <div
                  className="w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: sel ? activePath.accent : "transparent",
                    border: sel ? "none" : "2px solid rgba(255,255,255,0.2)",
                  }}
                >
                  {sel && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <span className="text-sm" style={{ color: sel ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)" }}>
                  {r}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Done button */}
      <button
        className="w-full rounded-xl py-3 text-sm font-semibold"
        style={{ background: "#f97316", color: "#fff" }}
      >
        Done
      </button>

      {/* Skip card */}
      <button
        className="w-full rounded-xl px-4 py-3 flex items-center justify-between transition-all duration-200"
        style={{
          background: "linear-gradient(135deg, #1e1810, #2a2015)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div className="flex items-center gap-3">
          <ChevronRight size={16} style={{ color: "#f97316" }} />
          <span className="text-sm text-white/60">Skip to goal selection</span>
        </div>
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
        <span className="text-xs font-medium uppercase tracking-wider text-white/30">Other Life Areas</span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
      </div>

      {/* Life area cards 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {LIFE_AREAS.map((a) => {
          const sel = selectedAreas.has(a.id)
          const Icon = a.icon
          return (
            <button
              key={a.id}
              onClick={() => setSelectedAreas((prev) => toggle(prev, a.id))}
              className="relative rounded-xl px-4 py-4 text-left transition-all duration-200 overflow-hidden"
              style={{
                background: sel ? a.bgSel : a.bg,
                border: sel ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {sel && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl" style={{ background: a.accent }} />
              )}
              <Icon size={20} className="mb-2" style={{ color: a.accent }} />
              <div className="text-sm font-medium text-white">{a.label}</div>
              <div className="text-xs mt-1 text-white/40">{a.desc}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
