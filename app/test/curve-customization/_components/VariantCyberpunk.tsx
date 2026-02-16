"use client"

import { RotateCcw } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { CurveSVG } from "./CurveSVG"
import type { CurveDemoReturn } from "./useCurveDemo"

interface VariantCyberpunkProps {
  demo: CurveDemoReturn
}

const CYBER_DESCRIPTIONS: Record<string, string> = {
  "Many small steps": "INCREMENTAL",
  "Steady climb": "LINEAR",
  "Few big leaps": "EXPONENTIAL",
}

const MUTED = "#555555"

export default function VariantCyberpunk({ demo }: VariantCyberpunkProps) {
  const { config, displayMilestones, displayCurvePoints, displayConfig, activePresetId, displayTensionDisplay, displayYLabels, presets, isCustom, isPreview } = demo

  const milestoneSummary = displayMilestones
    .map((m) => m.value.toLocaleString())
    .join(" > ")

  return (
    <div style={{ background: "#050505" }} className="p-6 rounded">
      {/* Main card */}
      <div
        style={{
          background: "#0a0a0a",
          borderRadius: "4px",
          border: "1px solid #1c1c1c",
          boxShadow:
            "0 0 20px rgba(255,0,51,0.06), inset 0 0 40px rgba(255,0,51,0.02)",
          padding: "16px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Scanline overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 10,
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,51,0.03) 2px, rgba(255,0,51,0.03) 4px)",
          }}
        />

        {/* Corner brackets */}
        {/* Top-left */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "12px",
            height: "12px",
            borderTop: "2px solid #ff0033",
            borderLeft: "2px solid #ff0033",
            zIndex: 11,
          }}
        />
        {/* Top-right */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "12px",
            height: "12px",
            borderTop: "2px solid #ff0033",
            borderRight: "2px solid #ff0033",
            zIndex: 11,
          }}
        />
        {/* Bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "12px",
            height: "12px",
            borderBottom: "2px solid #ff0033",
            borderLeft: "2px solid #ff0033",
            zIndex: 11,
          }}
        />
        {/* Bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: "12px",
            height: "12px",
            borderBottom: "2px solid #ff0033",
            borderRight: "2px solid #ff0033",
            zIndex: 11,
          }}
        />

        {/* Header */}
        <div
          style={{ position: "relative", zIndex: 5 }}
          className="flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-3">
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                  fontSize: "14px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#e0e0e0",
                }}
              >
                APPROACH VOLUME
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#555555",
                }}
              >
                PROGRESSION PLAN
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              style={{
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                fontSize: "10px",
                textTransform: "uppercase",
                border: "1px solid rgba(255,0,51,0.3)",
                background: "rgba(255,0,51,0.08)",
                color: "#ff0033",
                borderRadius: "2px",
                padding: "2px 6px",
              }}
            >
              AUTO-SYNCED
            </span>

            {/* Target input */}
            <input
              type="number"
              value={demo.config.target}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                if (!isNaN(val) && val > demo.config.start) {
                  demo.setConfig((c) => ({ ...c, target: val }))
                }
              }}
              style={{
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                fontSize: "13px",
                fontWeight: 600,
                color: "#e0e0e0",
                background: "#0a0a0a",
                border: "1px solid #1c1c1c",
                borderRadius: "2px",
                padding: "4px 8px",
                width: "80px",
                textAlign: "right",
                outline: "none",
              }}
            />
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 5 }}>
            {/* Presets */}
            <div
              style={{
                borderRadius: "2px",
                border: "1px solid #1c1c1c",
                display: "flex",
              }}
              className="mb-3"
            >
              {presets.map((preset, idx) => {
                const isActive = activePresetId === preset.id
                return (
                  <button
                    key={preset.id}
                    onClick={() => demo.selectPreset(preset)}
                    onMouseEnter={() => demo.hoverPreset(preset.id)}
                    onMouseLeave={() => demo.unhoverPreset()}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      background: isActive
                        ? "rgba(255,0,51,0.08)"
                        : "transparent",
                      border: "none",
                      borderRight:
                        idx < presets.length - 1
                          ? "1px solid #1c1c1c"
                          : "none",
                      cursor: "pointer",
                      position: "relative",
                      textAlign: "left",
                    }}
                  >
                    {/* Active top bar */}
                    {isActive && (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: "2px",
                          background: "#ff0033",
                          boxShadow: "0 0 8px rgba(255,0,51,0.5)",
                        }}
                      />
                    )}
                    <div
                      style={{
                        fontFamily:
                          "var(--font-mono, 'Geist Mono', monospace)",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: isActive ? "#ff0033" : "#e0e0e0",
                      }}
                    >
                      {preset.label.toUpperCase()}
                    </div>
                    <div
                      style={{
                        fontFamily:
                          "var(--font-mono, 'Geist Mono', monospace)",
                        fontSize: "9px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        opacity: 0.35,
                        color: "#e0e0e0",
                        marginTop: "2px",
                      }}
                    >
                      {CYBER_DESCRIPTIONS[preset.description] ??
                        preset.description.toUpperCase()}
                    </div>
                  </button>
                )
              })}
            </div>

            {isCustom && !isPreview && (
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.1em", textTransform: "uppercase", color: "#ff0033", background: "rgba(255,0,51,0.1)", borderRadius: 4, padding: "2px 8px", marginTop: 8, display: "inline-block" }}>Custom</span>
            )}

            {/* SVG */}
            <div
              style={{
                borderRadius: "2px",
                background: "#080808",
                border: "1px solid rgba(255,0,51,0.15)",
                padding: "12px",
              }}
              className="mb-3"
            >
              <CurveSVG
                milestones={displayMilestones}
                curvePoints={displayCurvePoints}
                config={displayConfig}
                yLabels={displayYLabels}
                colors={{
                  accent: "#ff0033",
                  grid: "#ff0033",
                  axis: "#ff0033",
                  tooltipBg: "#0a0a0a",
                  tooltipBorder: "rgba(255, 0, 51, 0.6)",
                  areaTop: "rgba(255, 0, 51, 0.12)",
                  areaBottom: "rgba(255, 0, 51, 0.01)",
                  labelColor: "#e0e0e0",
                  endpointColor: "#ff0033",
                }}
                glowIntensity={4}
                glowOpacity={0.45}
                strokeWidth={2}
                cursor="crosshair"
                onStepsChange={demo.setSteps}
              />
            </div>

            {/* Milestone ladder summary */}
            <div
              style={{
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                fontSize: "11px",
                color: "#555555",
              }}
              className="mb-3"
            >
              {milestoneSummary}
            </div>

            {/* Curve shape controls */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span
                  style={{
                    fontFamily:
                      "var(--font-mono, 'Geist Mono', monospace)",
                    fontSize: "12px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#e0e0e0",
                  }}
                >
                  CURVE_SHAPE
                </span>
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontFamily:
                        "var(--font-mono, 'Geist Mono', monospace)",
                      fontSize: "11px",
                      color: "#ffcc00",
                      background: "rgba(255,204,0,0.08)",
                      borderRadius: "2px",
                      padding: "2px 6px",
                    }}
                  >
                    {displayTensionDisplay.toUpperCase()}
                  </span>
                  <span
                    style={{
                      fontFamily:
                        "var(--font-mono, 'Geist Mono', monospace)",
                      fontSize: "10px",
                      color: "#555555",
                    }}
                  >
                    {displayConfig.steps} MILESTONES
                  </span>
                </div>
              </div>

              {/* Slider with sharp styling */}
              <div className="cyber-slider">
                <Slider
                  value={[demo.config.curveTension]}
                  onValueChange={(v) => demo.setTension(v[0])}
                  min={-2}
                  max={2}
                  step={0.1}
                  className="w-full [&_[data-slot=slider-track]]:rounded-none [&_[data-slot=slider-track]]:bg-[#1c1c1c] [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-range]]:bg-[#ff0033] [&_[data-slot=slider-range]]:rounded-none [&_[data-slot=slider-thumb]]:rounded-none [&_[data-slot=slider-thumb]]:border-[#ff0033] [&_[data-slot=slider-thumb]]:bg-[#ff0033] [&_[data-slot=slider-thumb]]:size-3 [&_[data-slot=slider-thumb]]:shadow-[0_0_6px_rgba(255,0,51,0.5)]"
                />
              </div>

              <div
                className="flex justify-between mt-1"
                style={{
                  fontFamily:
                    "var(--font-mono, 'Geist Mono', monospace)",
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "#555555",
                }}
              >
                <span>FEWER BIG LEAPS</span>
                <span>MANY SMALL WINS</span>
              </div>
              <p style={{ fontSize: 11, color: MUTED, opacity: 0.5, margin: 0, marginTop: 6, lineHeight: 1.4, fontFamily: "var(--font-mono, monospace)" }}>
                Adjusts how milestones are distributed. Left for bigger jumps later, right for quick wins early.
              </p>
            </div>

            {/* Advanced + Reset */}
            <div
              className="flex items-center justify-between"
              style={{
                borderTop: "1px solid #1c1c1c",
                paddingTop: "8px",
              }}
            >
              <button
                onClick={demo.addControlPoint}
                style={{
                  fontFamily:
                    "var(--font-mono, 'Geist Mono', monospace)",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  color: "#555555",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ADV.CONFIG
              </button>
              <button
                onClick={demo.resetCurve}
                className="flex items-center gap-1"
                style={{
                  fontFamily:
                    "var(--font-mono, 'Geist Mono', monospace)",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  color: "#555555",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <RotateCcw size={12} />
                SYS.RESET
              </button>
            </div>

            {/* Control points (if any) */}
            {(demo.config.controlPoints ?? []).length > 0 && (
              <div className="mt-2 space-y-1">
                {(demo.config.controlPoints ?? []).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between"
                    style={{
                      fontFamily:
                        "var(--font-mono, 'Geist Mono', monospace)",
                      fontSize: "10px",
                      color: "#555555",
                    }}
                  >
                    <span>MILESTONE_{idx + 1}:</span>
                    <button
                      onClick={() => demo.removeControlPoint(idx)}
                      style={{
                        color: "#ff0033",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily:
                          "var(--font-mono, 'Geist Mono', monospace)",
                        fontSize: "10px",
                        textTransform: "uppercase",
                      }}
                    >
                      [DEL]
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Range display */}
            <div className="flex items-center justify-between mt-3">
              <span
                style={{
                  fontFamily:
                    "var(--font-mono, 'Geist Mono', monospace)",
                  fontSize: "10px",
                  textTransform: "uppercase",
                  color: "#555555",
                }}
              >
                START &gt; GOAL
              </span>
              <span
                style={{
                  fontFamily:
                    "var(--font-mono, 'Geist Mono', monospace)",
                  fontSize: "13px",
                  color: "#ff0033",
                }}
              >
                {demo.config.start.toLocaleString()} &gt;{" "}
                {demo.config.target.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

      {/* Frequency cards */}
      <div className="space-y-2 mt-2">
        {/* Approach frequency card */}
        <div
          style={{
            borderRadius: "2px",
            border: "1px solid #1c1c1c",
            borderLeft: "3px solid #ff0033",
            boxShadow: "-4px 0 12px rgba(255,0,51,0.1)",
            padding: "12px",
            background: "#0a0a0a",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div
                style={{
                  fontFamily:
                    "var(--font-mono, 'Geist Mono', monospace)",
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#e0e0e0",
                }}
              >
                APPROACH FREQUENCY
              </div>
              <div
                style={{
                  fontFamily:
                    "var(--font-mono, 'Geist Mono', monospace)",
                  fontSize: "10px",
                  textTransform: "uppercase",
                  color: "#555555",
                  marginTop: "2px",
                }}
              >
                HABIT RAMP
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontFamily:
                    "var(--font-mono, 'Geist Mono', monospace)",
                  fontSize: "10px",
                  textTransform: "uppercase",
                  border: "1px solid rgba(255,0,51,0.3)",
                  background: "rgba(255,0,51,0.08)",
                  color: "#ff0033",
                  borderRadius: "2px",
                  padding: "2px 6px",
                }}
              >
                AUTO-SYNCED
              </span>
              <span
                style={{
                  fontFamily:
                    "var(--font-mono, 'Geist Mono', monospace)",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#ff0033",
                }}
              >
                10 /WK
              </span>
            </div>
          </div>
        </div>

        {/* Session frequency card */}
        <div
          style={{
            borderRadius: "2px",
            border: "1px solid #1c1c1c",
            borderLeft: "3px solid #ff0033",
            boxShadow: "-4px 0 12px rgba(255,0,51,0.1)",
            padding: "12px",
            background: "#0a0a0a",
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div
                style={{
                  fontFamily:
                    "var(--font-mono, 'Geist Mono', monospace)",
                  fontSize: "12px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#e0e0e0",
                }}
              >
                SESSION FREQUENCY
              </div>
              <div
                style={{
                  fontFamily:
                    "var(--font-mono, 'Geist Mono', monospace)",
                  fontSize: "10px",
                  textTransform: "uppercase",
                  color: "#555555",
                  marginTop: "2px",
                }}
              >
                HABIT RAMP
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                style={{
                  fontFamily:
                    "var(--font-mono, 'Geist Mono', monospace)",
                  fontSize: "10px",
                  textTransform: "uppercase",
                  border: "1px solid rgba(255,0,51,0.3)",
                  background: "rgba(255,0,51,0.08)",
                  color: "#ff0033",
                  borderRadius: "2px",
                  padding: "2px 6px",
                }}
              >
                AUTO-SYNCED
              </span>
              <span
                style={{
                  fontFamily:
                    "var(--font-mono, 'Geist Mono', monospace)",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#ff0033",
                }}
              >
                3 /WK
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
