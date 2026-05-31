"use client"

/**
 * TEMP: First-impression mockups for 5 goal creation variants.
 * Each renders just the above-the-fold "first screen" so the user
 * can compare vibes before committing to a full build.
 *
 * Remove this file after a variant is chosen.
 */

import { Compass, Lightbulb, ChevronDown } from "lucide-react"
import { LIFE_AREAS, getLifeAreaConfig } from "../data/lifeAreas"

interface VariantProps {
  lifeArea: string
  setLifeArea: (id: string) => void
}

// ─── Variant 1: Guided Journey ───────────────────────────────────────────────
export function Variant1_GuidedJourney({}: VariantProps) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      {/* Glowing icon */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{
          background: "linear-gradient(135deg, rgba(249,115,22,0.2), rgba(249,115,22,0.05))",
          boxShadow: "0 0 30px rgba(249,115,22,0.15)",
          border: "1px solid rgba(249,115,22,0.3)",
        }}
      >
        <Compass className="w-9 h-9 text-[#f97316]" />
      </div>

      <h2 className="text-2xl font-semibold text-[#f0f0f0] mb-3 tracking-tight">
        What do you want to change?
      </h2>

      <p className="text-[15px] text-[#9ca3af] leading-relaxed max-w-[320px] mb-8">
        Every transformation starts with a single decision.
        Let&apos;s turn yours into a plan you&apos;ll actually follow.
      </p>

      <button
        className="w-full max-w-[280px] py-3.5 rounded-xl text-white font-semibold text-[15px] tracking-wide transition-all duration-150 active:scale-[0.98]"
        style={{
          background: "linear-gradient(to right, #f97316, #ea580c)",
          boxShadow: "0 0 20px rgba(249,115,22,0.25)",
        }}
      >
        Let&apos;s build it &rarr;
      </button>

      <p className="text-xs text-[#4b5563] mt-4">Takes about 60 seconds</p>
    </div>
  )
}

// ─── Variant 2: Minimalist ───────────────────────────────────────────────────
export function Variant2_Minimalist({}: VariantProps) {
  return (
    <div className="px-6 pt-6 pb-6">
      <p className="text-[15px] text-white/50 font-medium mb-4">
        What&apos;s the goal?
      </p>

      <input
        type="text"
        placeholder="e.g. Run 5km 3x per week"
        className="w-full bg-transparent text-[17px] text-white placeholder:text-white/20 border-b border-white/[0.08] focus:border-orange-500/50 pb-3 outline-none transition-colors duration-200 caret-orange-500"
      />

      {/* Simulated inferred chips */}
      <div className="pt-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#f97316]/15 text-[#f97316] border border-[#f97316]/30">
          Daygame
          <span className="opacity-40 hover:opacity-100 text-[10px] cursor-pointer">&times;</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/[0.06] text-white/40 border border-white/[0.06]">
          3/wk
          <span className="opacity-40 hover:opacity-100 text-[10px] cursor-pointer">&times;</span>
        </span>
      </div>

      <div className="pt-5 flex items-center justify-between">
        <button className="text-[13px] text-white/30 hover:text-white/50 transition-colors">
          + Details
        </button>
        <button className="px-5 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-400 transition-all duration-150">
          Create goal
        </button>
      </div>
    </div>
  )
}

// ─── Variant 3: Identity-Based ───────────────────────────────────────────────
export function Variant3_Identity({ lifeArea, setLifeArea }: VariantProps) {
  const areaConfig = getLifeAreaConfig(lifeArea)

  return (
    <div className="px-6 pt-6 pb-6">
      {/* Life area icons */}
      <div className="text-center mb-6">
        <p className="text-[13px] text-[#a1a1aa] tracking-wide uppercase mb-4 font-medium">
          Choose your arena
        </p>
        <div className="flex justify-center gap-3">
          {LIFE_AREAS.filter((a) => a.id !== "custom").map((area) => {
            const Icon = area.icon
            const isSelected = lifeArea === area.id
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => setLifeArea(area.id)}
                className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ease-out ${
                  isSelected ? "scale-110" : "hover:scale-105 opacity-50 hover:opacity-80"
                }`}
                style={{
                  backgroundColor: isSelected ? area.hex : `${area.hex}15`,
                  border: `2px solid ${isSelected ? area.hex : `${area.hex}30`}`,
                  boxShadow: isSelected ? `0 0 20px ${area.hex}40, 0 0 40px ${area.hex}15` : "none",
                }}
              >
                <Icon className="size-5" style={{ color: isSelected ? "#fff" : area.hex }} />
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-sm font-semibold tracking-wide transition-all duration-300" style={{ color: areaConfig.hex }}>
          {areaConfig.name}
        </p>
      </div>

      {/* The big question */}
      <h2 className="text-xl font-bold text-[#f0f0f0] mb-1 text-center">
        Who are you becoming?
      </h2>
      <p className="text-[13px] text-[#71717a] mb-4 text-center">
        Not what you want to do. Who you want to <em className="text-[#a1a1aa] not-italic font-medium">be</em>.
      </p>

      {/* Identity textarea with accent bar */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full" style={{ backgroundColor: areaConfig.hex }} />
        <textarea
          placeholder="I am becoming..."
          rows={3}
          className="w-full pl-5 pr-4 py-4 bg-[#1e1e2e] text-[#f0f0f0] text-base leading-relaxed rounded-lg border border-[#2a2a3e] placeholder:text-[#52525b] placeholder:italic focus:outline-none resize-none transition-all duration-200"
          style={{ boxShadow: `inset 0 0 0 1px ${areaConfig.hex}30` }}
        />
      </div>

      {/* Rotating example */}
      <p className="mt-3 text-[12px] italic text-center" style={{ color: `${areaConfig.hex}90` }}>
        &ldquo;I am becoming ...the kind of man who walks up to anyone, anywhere, without hesitation.&rdquo;
      </p>
    </div>
  )
}

// ─── Variant 4: Mission Briefing ─────────────────────────────────────────────
export function Variant4_Mission({ lifeArea, setLifeArea }: VariantProps) {
  const areaConfig = getLifeAreaConfig(lifeArea)

  return (
    <div className="relative overflow-hidden">
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#f97316 1px, transparent 1px), linear-gradient(90deg, #f97316 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-[#2a2a40]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-[#f97316] animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#6b7280]">
                New Mission Briefing
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#4b5563]">
              {new Date().toLocaleDateString("en-US", { year: "2-digit", month: "2-digit", day: "2-digit" })}
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#6b7280]">
              Mission Objective
            </label>
            <input
              type="text"
              placeholder="Define your objective..."
              className="w-full bg-[#1a1a2e] border border-[#2a2a40] rounded px-3 py-2.5 text-[#e0e0e0] text-sm placeholder:text-[#4b5563] focus:border-[#f97316]/40 focus:ring-1 focus:ring-[#f97316]/20 focus:outline-none transition-colors font-medium"
            />
          </div>
        </div>

        {/* Theatre of Operations */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="h-px flex-1 bg-[#2a2a40]" />
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#6b7280] shrink-0">
              Theatre of Operations
            </span>
            <div className="h-px flex-1 bg-[#2a2a40]" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {LIFE_AREAS.filter((a) => a.id !== "custom").map((area) => {
              const Icon = area.icon
              const isSelected = lifeArea === area.id
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setLifeArea(area.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-all duration-150 ${
                    isSelected
                      ? "text-white border-transparent"
                      : "text-[#9ca3af] border-[#2a2a40] hover:border-[#4b5563] bg-[#141422]"
                  }`}
                  style={isSelected ? { backgroundColor: area.hex, boxShadow: `0 0 12px ${area.hex}30` } : undefined}
                >
                  <Icon className="size-3" />
                  {area.name}
                </button>
              )
            })}
          </div>

          {/* Mission Parameters */}
          <div className="flex items-center gap-2 mb-2.5 mt-5">
            <div className="h-px flex-1 bg-[#2a2a40]" />
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#6b7280] shrink-0">
              Mission Parameters
            </span>
            <div className="h-px flex-1 bg-[#2a2a40]" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Recurring Op", desc: "Repeating cadence", icon: "↻", selected: true },
              { label: "Campaign", desc: "One-time target", icon: "◆", selected: false },
              { label: "Escalation", desc: "Ramps over time", icon: "▲", selected: false },
            ].map(({ label, desc, icon, selected }) => (
              <button
                key={label}
                type="button"
                className={`relative py-2.5 px-2 rounded border text-left transition-all duration-150 ${
                  selected ? "border-[#f97316]/40 bg-[#f97316]/[0.08]" : "border-[#2a2a40] bg-[#141422] hover:border-[#4b5563]"
                }`}
              >
                {selected && (
                  <div className="absolute top-0 left-0 w-3 h-3">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-[#f97316]" />
                    <div className="absolute top-0 left-0 w-[2px] h-full bg-[#f97316]" />
                  </div>
                )}
                <span className="text-[11px] font-mono text-[#6b7280] block mb-0.5">{icon}</span>
                <span className={`text-xs font-medium block ${selected ? "text-[#f97316]" : "text-[#e0e0e0]"}`}>{label}</span>
                <span className="text-[10px] text-[#6b7280] block">{desc}</span>
              </button>
            ))}
          </div>

          {/* Difficulty readout preview */}
          <div className="mt-4 flex items-center gap-3 p-3 rounded border border-[#2a2a40] bg-[#141422]">
            <div className="flex-1">
              <span className="text-[9px] font-mono uppercase text-[#6b7280] block mb-1">Target</span>
              <span className="text-2xl font-mono font-bold text-[#f97316] tabular-nums">10</span>
            </div>
            <div className="flex-1">
              <span className="text-[9px] font-mono uppercase text-[#6b7280] block mb-1">Difficulty</span>
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((l) => (
                  <div key={l} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: l <= 3 ? "#eab308" : "#2a2a40" }} />
                ))}
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wide text-[#eab308]">Challenging</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#2a2a40] flex justify-between items-center" style={{ backgroundColor: "#0a0a18" }}>
          <button className="px-3 py-2 text-[11px] font-mono uppercase tracking-wide text-[#6b7280] border border-[#2a2a40] rounded hover:text-[#9ca3af] transition-colors">
            Abort
          </button>
          <button
            className="px-5 py-2 rounded text-sm font-semibold transition-all duration-200"
            style={{
              backgroundColor: "#f97316",
              color: "#0d0d1a",
              boxShadow: "0 0 20px #f9731630, inset 0 1px 0 #ffffff20",
            }}
          >
            Accept Mission
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Variant 5: Outcome-First (WOOP) ────────────────────────────────────────
export function Variant5_OutcomeFirst({ lifeArea, setLifeArea }: VariantProps) {
  const areaConfig = getLifeAreaConfig(lifeArea)

  return (
    <div className="relative px-6 pt-6 pb-6">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-20"
        style={{ background: `radial-gradient(circle, ${areaConfig.hex}, transparent 70%)` }}
      />

      {/* Progress indicator */}
      <div className="relative flex items-center gap-1.5 mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1 rounded-full transition-all duration-500 ${s === 1 ? "w-8" : "w-4"}`}
            style={{ backgroundColor: s === 1 ? areaConfig.hex : "#374151", opacity: s === 1 ? 1 : 0.4 }}
          />
        ))}
        <span className="ml-2 text-[11px] text-[#9ca3af] font-mono uppercase tracking-widest">
          Envision
        </span>
      </div>

      {/* Life Area Selection */}
      <div className="relative mb-5">
        <p className="text-[11px] text-[#9ca3af] uppercase tracking-wide mb-2">Life Area</p>
        <div className="flex flex-wrap gap-1.5">
          {LIFE_AREAS.filter((a) => a.id !== "custom").map((area) => {
            const Icon = area.icon
            const isSelected = lifeArea === area.id
            return (
              <button
                key={area.id}
                type="button"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                  isSelected
                    ? "border-transparent text-white shadow-lg"
                    : "border-[#374151] text-[#9ca3af] hover:text-[#e0e0e0] hover:border-[#4b5563]"
                }`}
                style={
                  isSelected
                    ? { backgroundColor: area.hex, boxShadow: `0 0 20px ${area.hex}30` }
                    : undefined
                }
                onClick={() => setLifeArea(area.id)}
              >
                <Icon className="size-3" />
                {area.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main prompt */}
      <h3 className="relative text-lg font-semibold text-[#e0e0e0] mb-1">
        Imagine it&apos;s 3 months from now.
      </h3>
      <p className="relative text-sm text-[#9ca3af] mb-4">
        What&apos;s different about your life? Don&apos;t think metrics &mdash; paint the picture.
      </p>

      {/* Vision textarea */}
      <textarea
        className="relative w-full rounded-lg border border-[#374151] bg-[#1f2937]/50 px-4 py-3 text-sm text-[#e0e0e0] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 resize-none transition-all duration-200"
        style={{ borderColor: "#374151" }}
        rows={4}
        placeholder="I walk down the street and I'm not nervous anymore. I see a woman I find attractive and I just... go. The conversation flows..."
      />

      {/* Prompt starters */}
      <div className="relative mt-3 space-y-1.5">
        <p className="text-[11px] text-[#6b7280] uppercase tracking-wide">Try starting with...</p>
        <div className="flex flex-wrap gap-1.5">
          {["I can approach without hesitation", "Women respond to my energy", "I have options, not desperation"].map((s) => (
            <button
              key={s}
              className="text-xs px-2.5 py-1 rounded-md border border-[#374151] text-[#9ca3af] hover:text-[#e0e0e0] hover:border-[#4b5563] transition-colors"
            >
              &ldquo;{s}...&rdquo;
            </button>
          ))}
        </div>
      </div>

      {/* Next button */}
      <div className="relative mt-6 flex justify-end">
        <button
          className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-all duration-200"
          style={{
            backgroundColor: areaConfig.hex,
            boxShadow: `0 4px 14px ${areaConfig.hex}40`,
          }}
        >
          Now ground it &rarr;
        </button>
      </div>
    </div>
  )
}
