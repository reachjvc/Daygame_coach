"use client"

import { useState } from "react"
import { RotateCcw } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { CurveSVG } from "./CurveSVG"
import type { CurveDemoReturn } from "./useCurveDemo"

interface VariantZenProps {
  demo: CurveDemoReturn
}

/* ── Zen palette (light mode) ── */
const PRIMARY = "#0d9488"
const PRIMARY_LIGHT = "#14b8a6"
const PRIMARY_FADED = "rgba(13, 148, 136, 0.08)"
const BG = "#fafaf9"
const CARD_BG = "#ffffff"
const TEXT = "#1c1917"
const MUTED = "#a8a29e"
const SECONDARY = "#78716c"
const BORDER = "#e7e5e4"
const SUBTLE_BORDER = "#f5f5f4"

/* ── Tiny reusable pieces ── */

function FakeToggle({ on = true }: { on?: boolean }) {
  return (
    <div
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: on ? PRIMARY : BORDER,
        position: "relative",
        flexShrink: 0,
        transition: "background 150ms ease",
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 7,
          background: "#ffffff",
          position: "absolute",
          top: 3,
          left: on ? 19 : 3,
          transition: "left 150ms ease",
          boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
        }}
      />
    </div>
  )
}

function AutoSyncBadge() {
  return (
    <span
      style={{
        background: PRIMARY_FADED,
        color: PRIMARY,
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

export default function VariantZen({ demo }: VariantZenProps) {
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
    <div style={{ background: BG }} className="p-6 rounded-xl">
      {/* ── Main card ── */}
      <div
        style={{
          background: CARD_BG,
          borderRadius: 12,
          border: `1px solid ${BORDER}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          padding: 24,
        }}
      >
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
                  letterSpacing: "-0.02em",
                }}
              >
                Approach Volume
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span style={{ fontSize: 13, color: MUTED }}>
                  Milestone Ladder
                </span>
                <AutoSyncBadge />
              </div>
            </div>
          </div>

          {/* Target display */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 12, color: SECONDARY }}>Target:</span>
            <input
              type="number"
              value={config.target}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                if (!isNaN(val) && val > config.start) {
                  demo.setConfig((c) => ({ ...c, target: val }))
                }
              }}
              style={{
                width: 72,
                textAlign: "right",
                borderRadius: 8,
                background: CARD_BG,
                border: `1px solid ${BORDER}`,
                color: TEXT,
                fontSize: 14,
                fontWeight: 500,
                padding: "4px 10px",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                outline: "none",
                transition: "border-color 150ms ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = PRIMARY
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = BORDER
              }}
            />
          </div>
        </div>

        {/* Show/Hide curve */}
        <button
          onClick={() => setShowCurve((v) => !v)}
          style={{
            fontSize: 12,
            color: SECONDARY,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            marginTop: 12,
            textDecoration: "none",
            transition: "text-decoration 150ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = "underline"
            e.currentTarget.style.textUnderlineOffset = "3px"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = "none"
          }}
        >
          {showCurve ? "Hide curve" : "Show curve"}
        </button>

        {showCurve && (
          <>
            {/* ── Segmented control presets ── */}
            <div
              style={{
                background: SUBTLE_BORDER,
                borderRadius: 8,
                padding: 3,
                display: "inline-flex",
                gap: 2,
                marginTop: 16,
              }}
            >
              {presets.map((preset) => {
                const isActive = activePresetId === preset.id
                return (
                  <button
                    key={preset.id}
                    onClick={() => demo.selectPreset(preset)}
                    style={{
                      borderRadius: 6,
                      padding: "8px 16px",
                      background: isActive ? CARD_BG : "transparent",
                      boxShadow: isActive
                        ? "0 1px 2px rgba(0,0,0,0.06)"
                        : "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      transition: "all 150ms ease",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: isActive ? TEXT : SECONDARY,
                        transition: "color 150ms ease",
                      }}
                    >
                      {preset.label}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: MUTED,
                        marginTop: 1,
                      }}
                    >
                      {preset.description}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* ── SVG curve area ── */}
            <div
              style={{
                padding: "16px 0",
                borderTop: `1px solid ${SUBTLE_BORDER}`,
                borderBottom: `1px solid ${SUBTLE_BORDER}`,
                marginTop: 16,
              }}
            >
              <CurveSVG
                milestones={milestones}
                curvePoints={curvePoints}
                config={config}
                yLabels={yLabels}
                colors={{
                  accent: "#0d9488",
                  grid: "#1c1917",
                  axis: "#1c1917",
                  tooltipBg: "#ffffff",
                  tooltipBorder: "#e7e5e4",
                  tooltipText: "#1c1917",
                  areaTop: "rgba(13, 148, 136, 0.06)",
                  areaBottom: "rgba(13, 148, 136, 0.01)",
                  labelColor: "#a8a29e",
                  endpointColor: "#0d9488",
                }}
                glowIntensity={0}
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
                marginTop: 12,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {milestones
                .map((m) => m.value.toLocaleString())
                .join(" \u2192 ")}
            </div>

            {/* ── Curve shape controls ── */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: TEXT,
                  }}
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
                      background: "rgba(13,148,136,0.06)",
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
                className="[&_[data-slot=slider-track]]:bg-[#e7e5e4] [&_[data-slot=slider-range]]:bg-[#0d9488] [&_[data-slot=slider-thumb]]:border-[#0d9488] [&_[data-slot=slider-thumb]]:bg-white"
              />

              <div
                className="flex justify-between mt-1.5"
                style={{ fontSize: 12, color: MUTED }}
              >
                <span>Fewer big leaps</span>
                <span>Many small wins</span>
              </div>
            </div>

            {/* ── Advanced + Reset row ── */}
            <div
              className="flex items-center justify-between mt-3 pt-2"
              style={{ borderTop: `1px solid ${SUBTLE_BORDER}` }}
            >
              <button
                onClick={() => setShowAdvanced((v) => !v)}
                style={{
                  fontSize: 13,
                  color: SECONDARY,
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
                  fontSize: 13,
                  color: SECONDARY,
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
                    color: PRIMARY,
                    background: "transparent",
                    border: `1px solid rgba(13,148,136,0.3)`,
                    borderRadius: 8,
                    padding: "6px 14px",
                    cursor:
                      (config.controlPoints?.length ?? 0) >= 3
                        ? "not-allowed"
                        : "pointer",
                    opacity:
                      (config.controlPoints?.length ?? 0) >= 3 ? 0.4 : 1,
                    transition: "opacity 150ms ease",
                  }}
                >
                  + Add Control Point
                </button>

                {(config.controlPoints ?? []).map((cp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2"
                    style={{ fontSize: 12, color: SECONDARY }}
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
                        color: "#ef4444",
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
              <span style={{ fontSize: 14, color: SECONDARY }}>Range</span>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
        {/* Approach Frequency */}
        <div
          style={{
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            padding: 20,
          }}
        >
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
                    letterSpacing: "-0.02em",
                  }}
                >
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
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            padding: 20,
          }}
        >
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
                    letterSpacing: "-0.02em",
                  }}
                >
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
