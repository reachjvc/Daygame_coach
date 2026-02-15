"use client"

import { useState, useRef, useCallback, createContext, useContext } from "react"
import Image from "next/image"
import { getRoleModelById, ROLE_MODEL_CATEGORIES } from "@/src/inner-game/data/roleModels"
import type { EffectIntensities } from "@/src/inner-game/types"
import {
  AmbientEffects,
  AGREED_DEFAULTS,
  breathingScale,
} from "@/src/inner-game/components/AmbientEffects"

const STILL_IMAGE = "/marcus-test/marcus_alive4_01.png"
const VIDEO_SRC = "/Marcus/liveportrait_output/marcus_loop_01--test7.mp4"
const VIDEO_SRC_1_2X = "/Marcus/liveportrait_output/marcus_loop_01--default_driver_1.2x.mp4"

const marcus = getRoleModelById("marcus-aurelius")!
const categoryInfo = ROLE_MODEL_CATEGORIES.find(c => c.id === marcus.category)!

// ============================================================================
// AGREED EFFECT SETTINGS (2026-02-15)
// ──────────────────────────────────────────────────────────────────
// Spotlight Sweep : MED (2)    Warm Flicker : MED (2)
// Ember Particles : MED (2)    Breathing    : OFF (0)
// Vignette        : HIGH (3)   Rim Light    : LOW (1)
//
// Modal boost: embers 8/16/28 (vs 4/8/14), spotlight/flicker/rim 1.4x
// Video objectPosition: center 10%
// ============================================================================

const EffectContext = createContext<EffectIntensities>(AGREED_DEFAULTS)

const LEVEL_LABELS = ["OFF", "LOW", "MED", "HIGH"] as const

const effectLabels: Record<keyof EffectIntensities, string> = {
  spotlight: "Spotlight Sweep",
  flicker: "Warm Flicker",
  embers: "Ember Particles",
  breathing: "Breathing Pulse",
  vignette: "Vignette",
  rimLight: "Rim Light",
}

export default function MarcusLoopPage() {
  const [effects, setEffects] = useState<EffectIntensities>(AGREED_DEFAULTS)

  const cycle = (key: keyof EffectIntensities) =>
    setEffects(prev => ({ ...prev, [key]: (prev[key] + 1) % 4 }))

  return (
    <EffectContext.Provider value={effects}>
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center p-6 overflow-auto">
        <h1 className="text-white text-2xl font-bold mb-2">Role Model Portrait Test</h1>
        <p className="text-white/50 text-sm mb-8">CSS ambient effects on still · video on hover</p>

        {/* Single large preview */}
        <div className="mb-10">
          <RoleModelPortrait size={420} />
        </div>

        {/* Card row — simulating 5 role models */}
        <h2 className="text-white/60 text-sm mb-4">Card Preview (click for video)</h2>
        <div className="flex flex-wrap justify-center gap-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <RoleModelCard key={i} videoSrc={i >= 3 ? VIDEO_SRC_1_2X : VIDEO_SRC} label={i >= 3 ? "1.2× speed" : "1× speed"} />
          ))}
        </div>

        {/* Effect Controls */}
        <div className="mt-8 p-4 bg-zinc-900/50 rounded-lg max-w-lg w-full border border-white/5">
          <h3 className="text-white/80 font-medium mb-3">Effect Controls</h3>
          <p className="text-white/30 text-xs mb-3">Click to cycle: OFF → LOW → MED → HIGH</p>
          <div className="space-y-2">
            {(Object.keys(effects) as (keyof EffectIntensities)[]).map(key => {
              const level = effects[key]
              const levelColors = [
                "bg-zinc-800/50 border-white/5 text-white/40",
                "bg-orange-500/10 border-orange-500/20 text-orange-300/70",
                "bg-orange-500/20 border-orange-500/40 text-orange-300",
                "bg-orange-500/30 border-orange-500/60 text-orange-200",
              ]
              return (
                <button
                  key={key}
                  onClick={() => cycle(key)}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm border transition-all ${levelColors[level]}`}
                >
                  <span className="font-medium">{effectLabels[key]}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3].map(dot => (
                        <span
                          key={dot}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${
                            dot <= level ? "bg-orange-400" : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs w-8 text-right opacity-70">{LEVEL_LABELS[level]}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Settings Reference */}
        <div className="mt-4 p-3 bg-zinc-900/30 rounded-lg max-w-lg w-full border border-white/5">
          <p className="text-white/30 text-xs font-mono">
            Agreed defaults: spotlight=2 flicker=2 embers=2 breathing=0 vignette=3 rimLight=1
            <br />Modal boost: embers×2, opacity×1.4 | Video pos: center 10%
          </p>
        </div>
      </div>
    </EffectContext.Provider>
  )
}

/** The core portrait component: still image with CSS effects, video on hover */
function RoleModelPortrait({ size = 320, videoSrc = VIDEO_SRC }: { size?: number; videoSrc?: string }) {
  const [isHovered, setIsHovered] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fx = useContext(EffectContext)

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    setTimeout(() => {
      videoRef.current?.play().catch(() => {})
    }, 50)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [])

  return (
    <div
      className="role-model-portrait"
      style={{ width: size, height: size }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`portrait-still ${fx.breathing > 0 ? "portrait-breathing" : ""}`}
        style={{ opacity: isHovered ? 0 : 1 }}
      >
        <Image
          src={STILL_IMAGE}
          alt="Marcus Aurelius"
          fill
          className="object-cover portrait-image"
          priority
        />
      </div>

      {isHovered && (
        <video
          ref={videoRef}
          src={videoSrc}
          className="portrait-video"
          muted
          loop
          playsInline
        />
      )}

      <AmbientEffects fx={fx} />

      <style jsx>{`
        .role-model-portrait {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .portrait-still {
          position: absolute;
          inset: 0;
          transition: opacity 0.4s ease;
        }
        .portrait-breathing {
          animation: breathing ${fx.breathing === 1 ? "8s" : fx.breathing === 3 ? "4s" : "6s"} ease-in-out infinite;
        }
        .portrait-still :global(.portrait-image) {
          transform: scale(1.03);
        }
        @keyframes breathing {
          0%, 100% { transform: scale(1.0); }
          50% { transform: scale(${breathingScale[fx.breathing]}); }
        }
        .portrait-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1.03);
          z-index: 4;
        }
      `}</style>
    </div>
  )
}

/** Card variant with content below the portrait */
function RoleModelCard({ videoSrc = VIDEO_SRC, label }: { videoSrc?: string; label?: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const fx = useContext(EffectContext)
  const color = categoryInfo.color
  const displayValue = (v: string) => v.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())

  return (
    <>
      <div
        className="bg-gradient-to-b from-zinc-800/50 to-zinc-900 rounded-xl overflow-hidden border border-white/10 transition-all duration-300 cursor-pointer w-[220px]"
        style={{ ["--hover-border" as string]: `${color}66` }}
        onClick={() => setIsExpanded(true)}
        onMouseEnter={e => (e.currentTarget.style.borderColor = `${color}66`)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "")}
      >
        <div className="h-[220px] w-full">
          <RoleModelPortrait size={220} videoSrc={videoSrc} />
        </div>

        {label && (
          <div className="px-3 pt-2">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/40">{label}</span>
          </div>
        )}

        <div className="p-3 -mt-2 relative z-10">
          <h3 className="text-white font-semibold text-sm">{marcus.name}</h3>
          <p className="text-white/40 text-xs">{categoryInfo.label}</p>
          <p className="text-white/50 text-xs mt-1.5 italic line-clamp-2">
            &ldquo;{marcus.quote.slice(0, 60)}...&rdquo;
          </p>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {marcus.values.slice(0, 3).map((v, i) => (
              <span
                key={v}
                className="px-1.5 py-0.5 rounded text-[10px] border"
                style={{
                  backgroundColor: i === 0 ? `${color}15` : "rgba(255,255,255,0.03)",
                  borderColor: i === 0 ? `${color}30` : "rgba(255,255,255,0.1)",
                  color: i === 0 ? color : "rgba(255,255,255,0.5)",
                }}
              >
                {displayValue(v)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes modalBreathing {
          0%, 100% { transform: scale(1.0); }
          50% { transform: scale(${breathingScale[fx.breathing]}); }
        }
      `}</style>

      {/* Expanded modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="bg-zinc-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-[500px] overflow-hidden">
              <div
                className="absolute inset-0"
                style={fx.breathing > 0 ? {
                  animation: `modalBreathing ${fx.breathing === 1 ? "8s" : fx.breathing === 3 ? "4s" : "6s"} ease-in-out infinite`,
                } : undefined}
              >
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  src={videoSrc}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: "scale(1.03)", objectPosition: "center 10%" }}
                />
              </div>
              <AmbientEffects large fx={fx} />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zinc-900" style={{ zIndex: 3 }} />
              <button
                onClick={() => setIsExpanded(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 flex items-center justify-center z-10"
              >
                ✕
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                <p className="text-sm font-medium mb-1" style={{ color }}>{categoryInfo.label}</p>
                <h2 className="text-white text-3xl font-bold">{marcus.name}</h2>
                <p className="text-white/60 mt-1">{marcus.tagline}</p>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex flex-wrap gap-2">
                {marcus.values.map((v) => (
                  <span
                    key={v}
                    className="px-3 py-1.5 rounded-full text-sm border"
                    style={{ backgroundColor: `${color}15`, borderColor: `${color}30`, color }}
                  >
                    {displayValue(v)}
                  </span>
                ))}
              </div>

              <blockquote className="border-l-2 pl-4 py-2" style={{ borderColor: `${color}50` }}>
                <p className="text-white/90 text-lg italic">&ldquo;{marcus.quote}&rdquo;</p>
                {marcus.quoteSource && (
                  <cite className="text-white/50 text-sm mt-1 block">— {marcus.quoteSource}</cite>
                )}
              </blockquote>

              <div>
                <h3 className="font-semibold mb-2" style={{ color }}>Why {marcus.name}?</h3>
                <p className="text-white/70 leading-relaxed">{marcus.whyThisPerson}</p>
              </div>

              {marcus.corePhilosophy && marcus.corePhilosophy.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3" style={{ color }}>Core Philosophy</h3>
                  <ul className="space-y-2">
                    {marcus.corePhilosophy.map((p, i) => (
                      <li key={i} className="flex items-start gap-3 text-white/70">
                        <span style={{ color }} className="mt-1">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {marcus.definingMoment && (
                <div>
                  <h3 className="font-semibold mb-2" style={{ color }}>Defining Moment</h3>
                  <p className="text-white/70 leading-relaxed">{marcus.definingMoment}</p>
                </div>
              )}

              <div className="rounded-xl p-4 border" style={{ backgroundColor: `${color}08`, borderColor: `${color}20` }}>
                <h3 className="font-semibold mb-2" style={{ color }}>How This Helps You</h3>
                <p className="text-white/80 leading-relaxed">{marcus.howThisHelpsYou}</p>
              </div>

              {marcus.additionalQuotes && marcus.additionalQuotes.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3" style={{ color }}>More Wisdom</h3>
                  <div className="space-y-3">
                    {marcus.additionalQuotes.map((q, i) => (
                      <blockquote key={i} className="border-l border-white/20 pl-3 py-1">
                        <p className="text-white/60 italic">&ldquo;{q.text}&rdquo;</p>
                        {q.source && <cite className="text-white/40 text-sm">— {q.source}</cite>}
                      </blockquote>
                    ))}
                  </div>
                </div>
              )}

              <button
                className="w-full py-4 text-white font-semibold rounded-xl transition-all hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
              >
                Select {marcus.name} as Role Model
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
