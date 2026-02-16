"use client"

import { useState } from "react"
import { RotateCcw } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { CurveSVG } from "./CurveSVG"
import type { CurveDemoReturn } from "./useCurveDemo"

interface VariantFrostProps {
  demo: CurveDemoReturn
}

/* ── Frost palette ── */
const ACCENT = "#818cf8"
const BG = "#0f0d1a"
const CARD_BG = "rgba(255, 255, 255, 0.06)"
const TEXT = "#e8e4f0"
const MUTED = "#8b85a0"
const BORDER = "rgba(255, 255, 255, 0.12)"

const glassCard: React.CSSProperties = {
  background: CARD_BG,
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: 20,
  boxShadow:
    "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)",
  border: `1px solid ${BORDER}`,
  padding: 20,
}

/* ── Tiny reusable pieces ── */

function FakeToggle({ on = true }: { on?: boolean }) {
  return (
    <div
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: on ? "rgba(129,140,248,0.35)" : "rgba(255,255,255,0.10)",
        position: "relative",
        flexShrink: 0,
        transition: "background 0.2s",
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          background: on ? ACCENT : MUTED,
          position: "absolute",
          top: 3,
          left: on ? 19 : 3,
          transition: "left 0.2s, background 0.2s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
        }}
      />
    </div>
  )
}

function AutoSyncBadge() {
  return (
    <span
      style={{
        background: "rgba(129,140,248,0.12)",
        color: ACCENT,
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 8px",
        lineHeight: "16px",
        whiteSpace: "nowrap",
      }}
    >
      Auto-synced
    </span>
  )
}

/* ── Main component ── */

export default function VariantFrost({ demo }: VariantFrostProps) {
  const { config, milestones, curvePoints, activePresetId, tensionDisplay, yLabels, presets } = demo

  const [showCurve, setShowCurve] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div style={{ background: BG }} className="p-6 rounded-2xl">
      {/* ── Main glassmorphic card ── */}
      <div style={glassCard}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="pt-0.5">
              <FakeToggle on />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: TEXT }}>
                Approach Volume
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span style={{ fontSize: 12, color: MUTED }}>
                  Milestone Ladder
                </span>
                <AutoSyncBadge />
              </div>
            </div>
          </div>

          {/* Target display */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 12, color: MUTED }}>Target:</span>
            <div
              style={{
                width: 64,
                textAlign: "right",
                borderRadius: 8,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: TEXT,
                fontSize: 14,
                fontWeight: 500,
                padding: "4px 10px",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              }}
            >
              {config.target.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Hide curve toggle */}
        <button
          onClick={() => setShowCurve((v) => !v)}
          style={{
            fontSize: 12,
            color: MUTED,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            marginTop: 10,
          }}
        >
          {showCurve ? "Hide curve" : "Show curve"}
        </button>

        {showCurve && (
          <>
            {/* ── Preset buttons ── */}
            <div
              style={{
                borderRadius: 14,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                overflow: "hidden",
                marginTop: 14,
              }}
            >
              {presets.map((preset) => {
                const isActive = activePresetId === preset.id
                return (
                  <button
                    key={preset.id}
                    onClick={() => demo.selectPreset(preset)}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      padding: "10px 16px",
                      background: isActive
                        ? "rgba(129,140,248,0.10)"
                        : "transparent",
                      border: "none",
                      cursor: "pointer",
                      position: "relative",
                      transition: "background 0.15s",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: "0.03em",
                        color: isActive ? TEXT : MUTED,
                        transition: "color 0.15s",
                      }}
                    >
                      {preset.label}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: isActive ? TEXT : MUTED,
                        opacity: 0.45,
                        marginTop: 2,
                      }}
                    >
                      {preset.description}
                    </span>
                    {/* Active bottom bar */}
                    {isActive && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: 2,
                          background: `linear-gradient(90deg, ${ACCENT}, #a78bfa)`,
                        }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* ── SVG in glass panel ── */}
            <div
              style={{
                borderRadius: 16,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: 12,
                marginTop: 14,
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}
            >
              <CurveSVG
                milestones={milestones}
                curvePoints={curvePoints}
                config={config}
                yLabels={yLabels}
                colors={{
                  accent: "#818cf8",
                  grid: "#e8e4f0",
                  axis: "#e8e4f0",
                  tooltipBg: "rgba(30, 25, 50, 0.9)",
                  tooltipBorder: "rgba(129, 140, 248, 0.4)",
                  areaTop: "rgba(129, 140, 248, 0.15)",
                  areaBottom: "rgba(129, 140, 248, 0.02)",
                  labelColor: "#e8e4f0",
                  endpointColor: "#818cf8",
                }}
                glowIntensity={4}
                glowOpacity={0.3}
                onStepsChange={demo.setSteps}
              />
            </div>

            {/* ── Milestone ladder summary ── */}
            <div
              style={{
                fontSize: 12,
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                color: MUTED,
                opacity: 0.7,
                marginTop: 10,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {milestones.map((m) => m.value.toLocaleString()).join(" \u2192 ")}
            </div>

            {/* ── Curve shape controls ── */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 14, fontWeight: 500, color: TEXT }}>
                  Curve shape
                </span>
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily:
                        "var(--font-mono, 'Geist Mono', monospace)",
                      color: ACCENT,
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: 6,
                      padding: "4px 8px",
                    }}
                  >
                    {tensionDisplay}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: MUTED,
                      opacity: 0.6,
                    }}
                  >
                    {config.steps} steps
                  </span>
                </div>
              </div>

              <Slider
                value={[config.curveTension]}
                min={-2}
                max={2}
                step={0.1}
                onValueChange={([v]) => demo.setTension(v)}
                className="[&_[data-slot=slider-track]]:bg-white/[0.08] [&_[data-slot=slider-range]]:bg-[#818cf8] [&_[data-slot=slider-thumb]]:border-[#818cf8] [&_[data-slot=slider-thumb]]:bg-[#0f0d1a]"
              />

              <div
                className="flex justify-between mt-1.5"
                style={{ fontSize: 12, color: MUTED, opacity: 0.6 }}
              >
                <span>Fewer big leaps</span>
                <span>Many small wins</span>
              </div>
            </div>

            {/* ── Advanced + Reset row ── */}
            <div
              className="flex items-center justify-between mt-3 pt-2"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
            >
              <button
                onClick={() => setShowAdvanced((v) => !v)}
                style={{
                  fontSize: 12,
                  color: MUTED,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {showAdvanced ? "Hide advanced" : "Advanced"}
              </button>
              <button
                onClick={demo.resetCurve}
                className="flex items-center gap-1"
                style={{
                  fontSize: 12,
                  color: MUTED,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <RotateCcw size={12} />
                Reset
              </button>
            </div>

            {/* ── Advanced section ── */}
            {showAdvanced && (
              <div className="mt-3 space-y-2">
                <button
                  onClick={demo.addControlPoint}
                  disabled={(config.controlPoints?.length ?? 0) >= 3}
                  style={{
                    fontSize: 12,
                    color: ACCENT,
                    background: "transparent",
                    border: `1px solid rgba(129,140,248,0.3)`,
                    borderRadius: 8,
                    padding: "6px 14px",
                    cursor:
                      (config.controlPoints?.length ?? 0) >= 3
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      (config.controlPoints?.length ?? 0) >= 3 ? 0.4 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  + Add Control Point
                </button>

                {(config.controlPoints ?? []).map((cp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2"
                    style={{ fontSize: 12, color: MUTED }}
                  >
                    <span style={{ fontFamily: "var(--font-mono, monospace)" }}>
                      CP {idx + 1}: ({cp.x.toFixed(2)}, {cp.y.toFixed(2)})
                    </span>
                    <button
                      onClick={() => demo.removeControlPoint(idx)}
                      style={{
                        fontSize: 11,
                        color: "#f87171",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "0 4px",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <p
                  style={{
                    fontSize: 11,
                    color: MUTED,
                    opacity: 0.5,
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  Control points warp the curve at specific positions. Max 3
                  points.
                </p>
              </div>
            )}

            {/* ── Range display ── */}
            <div className="flex items-center justify-between mt-4">
              <span style={{ fontSize: 14, color: MUTED }}>Range</span>
              <span
                style={{
                  fontSize: 14,
                  fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                  color: ACCENT,
                }}
              >
                {config.start.toLocaleString()} {"\u2192"}{" "}
                {config.target.toLocaleString()}
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Frequency cards ── */}
      <div className="space-y-3 mt-3">
        {/* Approach Frequency */}
        <div
          style={{
            ...glassCard,
            padding: 16,
            borderRadius: 16,
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="pt-0.5">
                <FakeToggle on />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>
                  Approach Frequency
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span style={{ fontSize: 12, color: MUTED }}>
                    Habit Ramp
                  </span>
                  <AutoSyncBadge />
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: 13,
                color: TEXT,
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              }}
            >
              Target:{" "}
              <span style={{ fontWeight: 600 }}>10 /wk</span>
            </span>
          </div>
        </div>

        {/* Session Frequency */}
        <div
          style={{
            ...glassCard,
            padding: 16,
            borderRadius: 16,
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="pt-0.5">
                <FakeToggle on />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>
                  Session Frequency
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span style={{ fontSize: 12, color: MUTED }}>
                    Habit Ramp
                  </span>
                  <AutoSyncBadge />
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: 13,
                color: TEXT,
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              }}
            >
              Target:{" "}
              <span style={{ fontWeight: 600 }}>3 /wk</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
