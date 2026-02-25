"use client"

import { useState, useEffect } from "react"
import { Sparkles, Heart, Crown, Dumbbell, Briefcase, Brain, Cigarette, ChevronRight, Check, Star } from "lucide-react"

const PATHS = [
  { id: "fto", label: "Find The One", desc: "Connection & commitment", icon: Star, accent: "#f97068" },
  { id: "abundance", label: "Abundance", desc: "Freedom & experience", icon: Crown, accent: "#ec4899" },
] as const

const REASONS = ["Get a girlfriend", "Find my dream girl", "Get engaged", "Be in a fulfilling relationship"]

const LIFE_AREAS = [
  { id: "health", label: "Health", desc: "Body & fitness", icon: Dumbbell, accent: "#22c55e" },
  { id: "career", label: "Career", desc: "Work & ambition", icon: Briefcase, accent: "#3b82f6" },
  { id: "growth", label: "Personal Growth", desc: "Mind & skills", icon: Brain, accent: "#eab308" },
  { id: "vices", label: "Vices", desc: "Habits to break", icon: Cigarette, accent: "#ef4444" },
]

const CARD = { bg: "#141418", border: "#222228" }
const GRAY = { icon: "rgba(255,255,255,0.3)", heading: "rgba(255,255,255,0.8)", desc: "rgba(255,255,255,0.3)" }

export function VariantC() {
  const [selectedPath, setSelectedPath] = useState<"fto" | "abundance" | null>(null)
  const [selectedReasons, setSelectedReasons] = useState<Set<string>>(new Set())
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set())
  const [sparkleOpacity, setSparkleOpacity] = useState(0.3)

  useEffect(() => {
    const interval = setInterval(() => setSparkleOpacity((o) => (o === 0.3 ? 0.6 : 0.3)), 1800)
    return () => clearInterval(interval)
  }, [])

  const toggle = (set: Set<string>, key: string) => {
    const next = new Set(set); next.has(key) ? next.delete(key) : next.add(key); return next
  }

  const activePath = PATHS.find((p) => p.id === selectedPath)

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto flex flex-col gap-5" style={{ background: "#09090b" }}>
      {/* Heading */}
      <div className="flex items-center gap-3 mb-1">
        <Sparkles
          size={22}
          style={{ color: `rgba(255,255,255,${sparkleOpacity})`, transition: "color 0.8s ease" }}
        />
        <h1 className="text-xl font-semibold" style={{ color: GRAY.heading }}>
          Shape Your Path to Mastery
        </h1>
      </div>

      {/* Dating & Daygame header — always has subtle green stripe */}
      <div
        className="relative rounded-xl px-5 py-4 flex items-center gap-3 overflow-hidden"
        style={{ background: CARD.bg, border: `1px solid ${CARD.border}` }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: "#00e676" }} />
        <Heart size={20} style={{ color: GRAY.icon }} />
        <span className="text-sm font-semibold" style={{ color: GRAY.heading }}>Dating &amp; Daygame</span>
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
                background: CARD.bg,
                border: `1px solid ${sel ? p.accent : CARD.border}`,
                boxShadow: sel ? `0 0 20px ${p.accent}20` : "none",
              }}
            >
              {sel && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: p.accent }} />
              )}
              <Icon
                size={20}
                className="mb-2"
                style={{ color: sel ? p.accent : GRAY.icon, transition: "color 0.2s ease" }}
              />
              <div className="text-sm font-semibold" style={{ color: sel ? "#fff" : GRAY.heading }}>
                {p.label}
              </div>
              <div className="text-xs mt-1" style={{ color: sel ? "rgba(255,255,255,0.5)" : GRAY.desc }}>
                {p.desc}
              </div>
            </button>
          )
        })}
      </div>

      {/* Reasons — shown when path selected */}
      {selectedPath && activePath && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: GRAY.desc }}>
            Your reasons
          </span>
          {REASONS.map((r) => {
            const sel = selectedReasons.has(r)
            return (
              <button
                key={r}
                onClick={() => setSelectedReasons((prev) => toggle(prev, r))}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150"
              >
                <div
                  className="w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: sel ? activePath.accent : "transparent",
                    border: sel ? "none" : `2px solid ${CARD.border}`,
                  }}
                >
                  {sel && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <span
                  className="text-sm transition-colors duration-150"
                  style={{ color: sel ? "rgba(255,255,255,0.9)" : GRAY.desc }}
                >
                  {r}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Done button — always orange */}
      <button
        className="w-full rounded-xl py-3 text-sm font-semibold"
        style={{ background: "#f97316", color: "#fff" }}
      >
        Done
      </button>

      {/* Skip card — subtle orange tint */}
      <button
        className="w-full rounded-xl px-4 py-3 flex items-center justify-between transition-all duration-200"
        style={{ background: "#1a1510", border: `1px solid rgba(249,115,22,0.25)` }}
      >
        <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Skip to goal selection</span>
        <ChevronRight size={16} style={{ color: "#f97316" }} />
      </button>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: GRAY.desc }}>
          Other Life Areas
        </span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
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
                background: CARD.bg,
                border: `1px solid ${sel ? a.accent : CARD.border}`,
                boxShadow: sel ? `0 0 20px ${a.accent}20` : "none",
              }}
            >
              {sel && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: a.accent }} />
              )}
              <Icon
                size={20}
                className="mb-2"
                style={{ color: sel ? a.accent : GRAY.icon, transition: "color 0.2s ease" }}
              />
              <div className="text-sm font-medium" style={{ color: sel ? "#fff" : GRAY.heading }}>
                {a.label}
              </div>
              <div className="text-xs mt-1" style={{ color: sel ? "rgba(255,255,255,0.5)" : GRAY.desc }}>
                {a.desc}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
