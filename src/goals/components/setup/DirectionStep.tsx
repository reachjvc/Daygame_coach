"use client"

import { Check, ChevronRight, Sparkles, Star } from "lucide-react"
import { getDaygamePathL1 } from "@/src/goals/data/goalGraph"
import type { DaygamePath, LifeAreaConfig } from "@/src/goals/types"

interface DirectionStepProps {
  lifeAreas: LifeAreaConfig[]
  selectedPath: DaygamePath | null
  selectedAreas: Set<string>
  onSelectPath: (path: DaygamePath) => void
  onToggleArea: (areaId: string) => void
}

export function DirectionStep({
  lifeAreas,
  selectedPath,
  selectedAreas,
  onSelectPath,
  onToggleArea,
}: DirectionStepProps) {
  const ftoL1s = getDaygamePathL1("fto")
  const abundanceL1s = getDaygamePathL1("abundance")
  const daygame = lifeAreas.find((a) => a.id === "daygame")
  const otherAreas = lifeAreas.filter((a) => a.id !== "daygame" && a.id !== "custom")

  return (
    <div className="min-h-screen pt-16 pb-36 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <div className="relative inline-block mb-3">
            <Sparkles className="size-8 text-emerald-400 opacity-60" />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(0,230,118,0.2) 0%, transparent 70%)",
                animation: "v9c-iconGlow 3s ease-in-out infinite",
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Shape Your Path to Mastery</h1>
          <p className="text-white/40 text-sm">
            Select your dating direction, then pick additional life areas to track.
          </p>
        </div>

        {daygame && (() => {
          const DgIcon = daygame.icon
          return (
            <div className="flex items-center gap-3 mb-4">
              <div
                className="size-7 rounded-lg flex items-center justify-center"
                style={{ background: `${daygame.hex}20` }}
              >
                <DgIcon className="size-4" style={{ color: daygame.hex }} />
              </div>
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: daygame.hex }}
              >
                {daygame.name}
              </span>
            </div>
          )
        })()}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <button
            onClick={() => onSelectPath("fto")}
            className="rounded-2xl p-5 text-left transition-all duration-300"
            style={{
              background: selectedPath === "fto"
                ? "rgba(0,230,118,0.08)"
                : "rgba(0,230,118,0.02)",
              backdropFilter: "blur(8px)",
              border: selectedPath === "fto"
                ? "1px solid rgba(0,230,118,0.3)"
                : "1px solid rgba(0,230,118,0.08)",
              boxShadow: selectedPath === "fto"
                ? "0 0 30px rgba(0,230,118,0.08), inset 0 1px 0 rgba(255,255,255,0.05)"
                : "none",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="size-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(0,230,118,0.15)" }}
              >
                <Star className="size-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Find The One</h3>
                <p className="text-xs text-white/40">Connection & commitment</p>
              </div>
              {selectedPath === "fto" && (
                <div style={{ animation: "v9c-checkPop 0.3s ease-out" }}>
                  <Check className="size-5 text-emerald-400" />
                </div>
              )}
            </div>
            <p className="text-sm text-white/50 mb-3">
              I want to find one special person and build something real.
            </p>
            <div className="space-y-1.5">
              {ftoL1s.slice(0, 3).map((l1) => (
                <div key={l1.id} className="flex items-center gap-2 text-xs text-white/40">
                  <ChevronRight className="size-3" />
                  <span>{l1.title}</span>
                </div>
              ))}
              {ftoL1s.length > 3 && (
                <span className="text-xs text-emerald-400/60 pl-5">
                  +{ftoL1s.length - 3} more paths
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => onSelectPath("abundance")}
            className="rounded-2xl p-5 text-left transition-all duration-300"
            style={{
              background: selectedPath === "abundance"
                ? "rgba(255,64,129,0.08)"
                : "rgba(255,64,129,0.02)",
              backdropFilter: "blur(8px)",
              border: selectedPath === "abundance"
                ? "1px solid rgba(255,64,129,0.3)"
                : "1px solid rgba(255,64,129,0.08)",
              boxShadow: selectedPath === "abundance"
                ? "0 0 30px rgba(255,64,129,0.08), inset 0 1px 0 rgba(255,255,255,0.05)"
                : "none",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="size-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,64,129,0.15)" }}
              >
                <Sparkles className="size-5 text-pink-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Abundance</h3>
                <p className="text-xs text-white/40">Freedom & experience</p>
              </div>
              {selectedPath === "abundance" && (
                <div style={{ animation: "v9c-checkPop 0.3s ease-out" }}>
                  <Check className="size-5 text-pink-400" />
                </div>
              )}
            </div>
            <p className="text-sm text-white/50 mb-3">
              I want to experience abundance and freedom in dating.
            </p>
            <div className="space-y-1.5">
              {abundanceL1s.slice(0, 3).map((l1) => (
                <div key={l1.id} className="flex items-center gap-2 text-xs text-white/40">
                  <ChevronRight className="size-3" />
                  <span>{l1.title}</span>
                </div>
              ))}
              {abundanceL1s.length > 3 && (
                <span className="text-xs text-pink-400/60 pl-5">
                  +{abundanceL1s.length - 3} more paths
                </span>
              )}
            </div>
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px" style={{ background: "rgba(0,255,127,0.06)" }} />
          <span className="text-xs uppercase tracking-wider text-emerald-300/25">Other Life Areas</span>
          <div className="flex-1 h-px" style={{ background: "rgba(0,255,127,0.06)" }} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {otherAreas.map((area) => {
            const Icon = area.icon
            const isSelected = selectedAreas.has(area.id)
            return (
              <button
                key={area.id}
                onClick={() => onToggleArea(area.id)}
                className="flex flex-col items-center gap-2.5 rounded-xl p-4 transition-all duration-300"
                style={{
                  background: isSelected ? `${area.hex}10` : "rgba(255,255,255,0.02)",
                  backdropFilter: "blur(8px)",
                  border: isSelected
                    ? `1px solid ${area.hex}40`
                    : "1px solid rgba(255,255,255,0.05)",
                  boxShadow: isSelected ? `0 0 20px ${area.hex}10` : "none",
                }}
              >
                <div
                  className="size-10 rounded-xl flex items-center justify-center transition-all duration-300"
                  style={{
                    background: isSelected ? `${area.hex}20` : "rgba(255,255,255,0.05)",
                    boxShadow: isSelected ? `0 0 12px ${area.hex}20` : "none",
                  }}
                >
                  <Icon
                    className="size-5"
                    style={{ color: isSelected ? area.hex : "rgba(255,255,255,0.4)" }}
                  />
                </div>
                <span
                  className={`text-xs font-medium text-center leading-tight ${isSelected ? "text-white" : "text-white/40"}`}
                >
                  {area.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <style>{`
        @keyframes v9c-iconGlow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.5); opacity: 1; }
        }
        @keyframes v9c-checkPop {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
