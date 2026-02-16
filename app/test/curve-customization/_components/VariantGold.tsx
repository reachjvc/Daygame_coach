"use client"

import { useState } from "react"
import { RotateCcw } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { CurveSVG } from "./CurveSVG"
import type { CurveDemoReturn } from "./useCurveDemo"

interface VariantGoldProps {
  demo: CurveDemoReturn
}

/* ── Premium Gold palette ── */
const PRIMARY = "#d4a015"
const SECONDARY = "#b8860b"
const TERTIARY = "#f0d060"
const BG = "#0e1117"
const CARD_BG = "#161b22"
const CARD_ELEVATED = "#1c2129"
const TEXT = "#e6dfd5"
const MUTED = "#7a7568"
const BORDER = "#2a2520"
const PANEL_BG = "#12161d"

const mainCard: React.CSSProperties = {
  background: CARD_BG,
  borderRadius: 12,
  border: `1px solid ${BORDER}`,
  boxShadow:
    "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,160,21,0.06)",
  padding: 20,
  position: "relative",
}

/* ── Tiny reusable pieces ── */

function GoldShimmer({ width = "60%" }: { width?: string }) {
  return (
    <div
      style={{
        height: 1,
        width,
        margin: "0 auto",
        background:
          "linear-gradient(90deg, transparent, rgba(212,160,21,0.3), transparent)",
        marginBottom: 16,
      }}
    />
  )
}

function FakeToggle({ on = true }: { on?: boolean }) {
  return (
    <div
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: on ? "rgba(212,160,21,0.4)" : BORDER,
        position: "relative",
        flexShrink: 0,
        transition: "background 300ms ease",
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
          transition: "left 300ms ease",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      />
    </div>
  )
}

function AutoSyncBadge() {
  return (
    <span
      style={{
        background: "rgba(212,160,21,0.10)",
        color: PRIMARY,
        border: "1px solid rgba(212,160,21,0.20)",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 500,
        padding: "2px 6px",
        lineHeight: "14px",
        whiteSpace: "nowrap",
      }}
    >
      Auto-synced
    </span>
  )
}

/* ── Main component ── */

export default function VariantGold({ demo }: VariantGoldProps) {
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
    <div style={{ background: BG }} className="p-6 rounded-2xl">
      {/* ── Main card ── */}
      <div style={mainCard}>
        {/* Gold shimmer line at top */}
        <GoldShimmer width="60%" />

        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="pt-0.5">
              <FakeToggle on />
            </div>
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: TEXT,
                  letterSpacing: "-0.01em",
                }}
              >
                Approach Volume
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  style={{
                    fontSize: 12,
                    color: MUTED,
                    fontStyle: "italic",
                  }}
                >
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
                borderRadius: 6,
                background: PANEL_BG,
                border: `1px solid ${BORDER}`,
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
            transition: "color 300ms ease",
          }}
        >
          {showCurve ? "Hide curve" : "Show curve"}
        </button>

        {showCurve && (
          <>
            {/* ── Preset buttons ── */}
            <div
              style={{
                borderRadius: 10,
                background: PANEL_BG,
                border: `1px solid ${BORDER}`,
                display: "flex",
                overflow: "hidden",
                marginTop: 14,
              }}
            >
              {presets.map((preset, idx) => {
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
                        ? "rgba(212,160,21,0.06)"
                        : "transparent",
                      border: "none",
                      borderRight:
                        idx < presets.length - 1
                          ? "1px solid rgba(212,160,21,0.10)"
                          : "none",
                      cursor: "pointer",
                      position: "relative",
                      transition: "background 300ms ease",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: "0.01em",
                        color: isActive ? TEXT : MUTED,
                        transition: "color 300ms ease",
                      }}
                    >
                      {preset.label}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: MUTED,
                        fontStyle: "italic",
                        opacity: 0.4,
                        marginTop: 2,
                        transition: "opacity 300ms ease",
                      }}
                    >
                      {preset.description}
                    </span>
                    {/* Active bottom bar — thin, elegant */}
                    {isActive && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: 1,
                          background: PRIMARY,
                        }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* ── SVG in dark panel ── */}
            <div
              style={{
                borderRadius: 8,
                background: PANEL_BG,
                border: "1px solid rgba(212,160,21,0.08)",
                padding: 16,
                marginTop: 14,
              }}
            >
              <CurveSVG
                milestones={milestones}
                curvePoints={curvePoints}
                config={config}
                yLabels={yLabels}
                colors={{
                  accent: "#d4a015",
                  grid: "#e6dfd5",
                  axis: "#e6dfd5",
                  tooltipBg: "#1c2129",
                  tooltipBorder: "rgba(212, 160, 21, 0.30)",
                  areaTop: "rgba(212, 160, 21, 0.10)",
                  areaBottom: "rgba(212, 160, 21, 0.01)",
                  labelColor: "#e6dfd5",
                  endpointColor: "#d4a015",
                }}
                glowIntensity={2.5}
                glowOpacity={0.2}
                strokeWidth={2}
                onStepsChange={demo.setSteps}
              />
            </div>

            {/* ── Milestone ladder summary ── */}
            <div
              style={{
                fontSize: 12,
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                color: MUTED,
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
                <span
                  style={{ fontSize: 14, fontWeight: 500, color: TEXT }}
                >
                  Curve shape
                </span>
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily:
                        "var(--font-mono, 'Geist Mono', monospace)",
                      color: PRIMARY,
                      background: "rgba(212,160,21,0.08)",
                      borderRadius: 6,
                      padding: "4px 8px",
                      transition: "background 300ms ease",
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
                className="[&_[data-slot=slider-track]]:bg-[#2a2520] [&_[data-slot=slider-range]]:bg-[#d4a015] [&_[data-slot=slider-thumb]]:border-[#d4a015] [&_[data-slot=slider-thumb]]:bg-[#0e1117]"
              />

              <div
                className="flex justify-between mt-1.5"
                style={{
                  fontSize: 12,
                  color: MUTED,
                  opacity: 0.6,
                  fontStyle: "italic",
                }}
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
                  transition: "color 300ms ease",
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
                  transition: "color 300ms ease",
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
                    color: PRIMARY,
                    background: "transparent",
                    border: `1px solid rgba(212,160,21,0.25)`,
                    borderRadius: 8,
                    padding: "6px 14px",
                    cursor:
                      (config.controlPoints?.length ?? 0) >= 3
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      (config.controlPoints?.length ?? 0) >= 3 ? 0.4 : 1,
                    transition: "opacity 300ms ease",
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
                        fontFamily:
                          "var(--font-mono, 'Geist Mono', monospace)",
                      }}
                    >
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
                        transition: "color 300ms ease",
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
                  color: PRIMARY,
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
            background: CARD_BG,
            borderRadius: 10,
            border: `1px solid ${BORDER}`,
            boxShadow:
              "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,160,21,0.06)",
            padding: 16,
          }}
        >
          <GoldShimmer width="40%" />
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="pt-0.5">
                <FakeToggle on />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: TEXT,
                  }}
                >
                  Approach Frequency
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    style={{
                      fontSize: 12,
                      color: MUTED,
                      fontStyle: "italic",
                    }}
                  >
                    Milestone Ladder
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
            background: CARD_BG,
            borderRadius: 10,
            border: `1px solid ${BORDER}`,
            boxShadow:
              "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,160,21,0.06)",
            padding: 16,
          }}
        >
          <GoldShimmer width="40%" />
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="pt-0.5">
                <FakeToggle on />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: TEXT,
                  }}
                >
                  Session Frequency
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    style={{
                      fontSize: 12,
                      color: MUTED,
                      fontStyle: "italic",
                    }}
                  >
                    Milestone Ladder
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
