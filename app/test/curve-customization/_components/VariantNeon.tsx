"use client"

import { useState } from "react"
import { RotateCcw } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { CurveSVG } from "./CurveSVG"
import type { CurveDemoReturn } from "./useCurveDemo"

interface VariantNeonProps {
  demo: CurveDemoReturn
}

/* ── Neon palette ── */
const CYAN = "#06b6d4"
const MAGENTA = "#d946ef"
const VIOLET = "#8b5cf6"
const BG = "#0c0018"
const CARD_BG = "#130025"
const CARD_INNER = "#0f001e"
const TEXT = "#f0e6ff"
const MUTED = "#6b5b8a"
const BORDER = "#2a1a45"

/* ── Gradient text helper ── */
const gradientText: React.CSSProperties = {
  background: `linear-gradient(90deg, ${CYAN}, ${MAGENTA})`,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
}

/* ── Gradient border wrapper ── */
function GradientBorder({
  children,
  radius = 17,
  opacity = 0.4,
  style,
}: {
  children: React.ReactNode
  radius?: number
  opacity?: number
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        padding: 1,
        borderRadius: radius,
        background: `linear-gradient(135deg, rgba(6,182,212,${opacity}), rgba(139,92,246,${opacity * 0.75}), rgba(217,70,239,${opacity}))`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ── Tiny reusable pieces ── */

function NeonToggle({ on = true }: { on?: boolean }) {
  return (
    <div
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: on
          ? `linear-gradient(90deg, ${CYAN}, ${MAGENTA})`
          : BORDER,
        opacity: on ? 0.5 : 1,
        position: "relative",
        flexShrink: 0,
        transition: "background 0.2s, opacity 0.2s",
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          background: TEXT,
          position: "absolute",
          top: 3,
          left: on ? 19 : 3,
          transition: "left 0.2s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
        }}
      />
    </div>
  )
}

function NeonBadge() {
  return (
    <span
      style={{
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 8px",
        lineHeight: "16px",
        whiteSpace: "nowrap",
        ...gradientText,
      }}
    >
      Auto-synced
    </span>
  )
}

/* ── Main component ── */

export default function VariantNeon({ demo }: VariantNeonProps) {
  const {
    config,
    milestones,
    curvePoints,
    activePresetId,
    tensionDisplay,
    yLabels,
    presets,
  } = demo

  const [showCurve, setShowCurve] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div
      style={{
        background: BG,
        padding: 24,
        borderRadius: 20,
        boxShadow: `0 4px 30px rgba(139,92,246,0.12), 0 0 60px rgba(6,182,212,0.06)`,
        backgroundImage: `radial-gradient(ellipse at 30% 20%, rgba(6,182,212,0.06), transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(217,70,239,0.04), transparent 50%)`,
      }}
    >
      {/* ── Main card with gradient border ── */}
      <GradientBorder radius={17} opacity={0.4}>
        <div style={{ borderRadius: 16, background: CARD_BG, padding: 20 }}>
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="pt-0.5">
                <NeonToggle on />
              </div>
              <div>
                <div
                  style={{ fontSize: 17, fontWeight: 700, color: TEXT }}
                >
                  Approach Volume
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span style={{ fontSize: 12, fontWeight: 500, color: MUTED }}>
                    Milestone Ladder
                  </span>
                  <NeonBadge />
                </div>
              </div>
            </div>

            {/* Target display */}
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 12, color: MUTED }}>Target:</span>
              <GradientBorder radius={9} opacity={0.35}>
                <div
                  style={{
                    width: 64,
                    textAlign: "right",
                    borderRadius: 8,
                    background: CARD_INNER,
                    color: TEXT,
                    fontSize: 14,
                    fontWeight: 500,
                    padding: "4px 10px",
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                  }}
                >
                  {config.target.toLocaleString()}
                </div>
              </GradientBorder>
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
              <GradientBorder
                radius={15}
                opacity={0.25}
                style={{ marginTop: 14 }}
              >
                <div
                  style={{
                    borderRadius: 14,
                    background: CARD_INNER,
                    display: "flex",
                    overflow: "hidden",
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
                            ? `linear-gradient(135deg, rgba(6,182,212,0.08), rgba(217,70,239,0.08))`
                            : "transparent",
                          border: "none",
                          cursor: "pointer",
                          position: "relative",
                          transition: "background 0.15s",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
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
                            fontWeight: 500,
                            color: isActive ? TEXT : MUTED,
                            opacity: 0.5,
                            marginTop: 2,
                          }}
                        >
                          {preset.description}
                        </span>
                        {/* Active gradient bottom bar */}
                        {isActive && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: 3,
                              background: `linear-gradient(90deg, ${CYAN}, ${VIOLET}, ${MAGENTA})`,
                            }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              </GradientBorder>

              {/* ── SVG in neon panel ── */}
              <div
                style={{
                  borderRadius: 12,
                  background: CARD_INNER,
                  border: `1px solid ${BORDER}`,
                  padding: 12,
                  marginTop: 14,
                }}
              >
                <CurveSVG
                  milestones={milestones}
                  curvePoints={curvePoints}
                  config={config}
                  yLabels={yLabels}
                  colors={{
                    accent: VIOLET,
                    grid: TEXT,
                    axis: TEXT,
                    tooltipBg: "#1a0030",
                    tooltipBorder: "rgba(139, 92, 246, 0.4)",
                    areaTop: "rgba(139, 92, 246, 0.15)",
                    areaBottom: "rgba(6, 182, 212, 0.02)",
                    labelColor: TEXT,
                    endpointColor: VIOLET,
                  }}
                  glowIntensity={4}
                  glowOpacity={0.35}
                  strokeWidth={3}
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
                  <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>
                    Curve shape
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily:
                          "var(--font-mono, 'Geist Mono', monospace)",
                        background: `linear-gradient(90deg, ${CYAN}, ${MAGENTA})`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
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
                  className="[&_[data-slot=slider-track]]:bg-[#2a1a45] [&_[data-slot=slider-range]]:bg-[#8b5cf6] [&_[data-slot=slider-thumb]]:border-[#8b5cf6] [&_[data-slot=slider-thumb]]:bg-[#0c0018]"
                />

                <div
                  className="flex justify-between mt-1.5"
                  style={{ fontSize: 12, color: MUTED, opacity: 0.65 }}
                >
                  <span>Fewer big leaps</span>
                  <span>Many small wins</span>
                </div>
              </div>

              {/* ── Advanced + Reset row ── */}
              <div
                className="flex items-center justify-between mt-3 pt-2"
                style={{ borderTop: `1px solid ${BORDER}` }}
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
                      borderRadius: 8,
                      padding: "6px 14px",
                      background: "transparent",
                      border: "none",
                      cursor:
                        (config.controlPoints?.length ?? 0) >= 3
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        (config.controlPoints?.length ?? 0) >= 3 ? 0.4 : 1,
                      transition: "opacity 0.15s",
                      ...gradientText,
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
                      <span
                        style={{
                          fontFamily: "var(--font-mono, monospace)",
                        }}
                      >
                        CP {idx + 1}: ({cp.x.toFixed(2)}, {cp.y.toFixed(2)})
                      </span>
                      <button
                        onClick={() => demo.removeControlPoint(idx)}
                        style={{
                          fontSize: 11,
                          color: MAGENTA,
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
                    ...gradientText,
                  }}
                >
                  {config.start.toLocaleString()} {"\u2192"}{" "}
                  {config.target.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      </GradientBorder>

      {/* ── Frequency cards ── */}
      <div className="space-y-3 mt-3">
        {/* Approach Frequency */}
        <GradientBorder radius={15} opacity={0.3}>
          <div
            style={{
              borderRadius: 14,
              background: CARD_BG,
              padding: 16,
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  <NeonToggle on />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>
                    Approach Frequency
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span style={{ fontSize: 12, color: MUTED }}>
                      Habit Ramp
                    </span>
                    <NeonBadge />
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
                <span style={{ fontWeight: 600, ...gradientText }}>
                  10 /wk
                </span>
              </span>
            </div>
          </div>
        </GradientBorder>

        {/* Session Frequency */}
        <GradientBorder radius={15} opacity={0.3}>
          <div
            style={{
              borderRadius: 14,
              background: CARD_BG,
              padding: 16,
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  <NeonToggle on />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>
                    Session Frequency
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span style={{ fontSize: 12, color: MUTED }}>
                      Habit Ramp
                    </span>
                    <NeonBadge />
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
                <span style={{ fontWeight: 600, ...gradientText }}>
                  3 /wk
                </span>
              </span>
            </div>
          </div>
        </GradientBorder>
      </div>
    </div>
  )
}
