"use client"

import { useState, useEffect } from "react"
import { Heart, Flame, ChevronRight } from "lucide-react"
import { LIFE_AREAS } from "@/src/goals/data/lifeAreas"
import { getCatalogGroups } from "@/src/goals/data/goalGraph"

interface CircuitLandingProps {
  onSelectPath: (path: "one_person" | "abundance") => void
}

/** Module type assignments for each life area — creative hardware metaphors */
const MODULE_MAP: Record<string, { type: string; address: string; status: string; color: string }> = {
  daygame: { type: "GPU", address: "0x00", status: "ONLINE", color: "#00ff41" },
  health_fitness: { type: "PWR", address: "0x01", status: "STANDBY", color: "#00e5ff" },
  career_business: { type: "CPU", address: "0x02", status: "STANDBY", color: "#a855f7" },
  social: { type: "NIC", address: "0x03", status: "STANDBY", color: "#3b82f6" },
  personal_growth: { type: "RAM", address: "0x04", status: "STANDBY", color: "#eab308" },
  lifestyle: { type: "SSD", address: "0x05", status: "STANDBY", color: "#14b8a6" },
  custom: { type: "I/O", address: "0x06", status: "IDLE", color: "#9ca3af" },
}

export function CircuitLanding({ onSelectPath }: CircuitLandingProps) {
  const { onePerson, abundance } = getCatalogGroups()
  const [activePulses, setActivePulses] = useState<number[]>([])

  // Simulate data pulses between modules
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePulses(
        Array.from({ length: 3 }, () => Math.floor(Math.random() * LIFE_AREAS.length))
      )
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative space-y-8">
      {/* System header */}
      <div className="relative text-center space-y-3 pt-4">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-bold tracking-widest"
          style={{
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            textTransform: "uppercase",
            background: "rgba(0, 255, 65, 0.06)",
            color: "#00ff41",
            border: "1px solid rgba(0, 255, 65, 0.2)",
            borderRadius: 2,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: "0 0 4px #00ff41" }} />
          SYSTEM BOOT v2.0
        </div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            color: "#00ff41",
            textShadow: "0 0 20px rgba(0, 255, 65, 0.3)",
          }}
        >
          DAYGAME_PROCESSOR
        </h1>
        <p
          className="max-w-lg mx-auto text-xs tracking-wide"
          style={{
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            color: "rgba(0, 255, 65, 0.4)",
          }}
        >
          Initialize primary objective module. Select core directive to configure system pipeline.
        </p>
      </div>

      {/* Main processor chip — SVG visualization */}
      <div className="relative max-w-3xl mx-auto">
        <svg viewBox="0 0 600 280" className="w-full" style={{ filter: "drop-shadow(0 0 20px rgba(0, 255, 65, 0.05))" }}>
          <defs>
            <filter id="chip-glow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
              <feFlood floodColor="#00ff41" floodOpacity="0.3" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="cyan-glow">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="blur" />
              <feFlood floodColor="#00e5ff" floodOpacity="0.3" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Central processor chip outline */}
          <rect x="180" y="30" width="240" height="220" rx="4" fill="none" stroke="#00ff41" strokeWidth="1.5" strokeOpacity="0.3" />
          <rect x="184" y="34" width="232" height="212" rx="2" fill="rgba(0, 255, 65, 0.02)" stroke="#00ff41" strokeWidth="0.5" strokeOpacity="0.15" />

          {/* Chip notch */}
          <circle cx="300" cy="36" r="6" fill="none" stroke="#00ff41" strokeWidth="0.8" strokeOpacity="0.3" />

          {/* Chip label */}
          <text x="300" y="62" textAnchor="middle" fill="#00ff41" fillOpacity="0.7" fontSize="9" fontFamily="monospace" fontWeight="700">
            DGC-2000 GOAL PROCESSOR
          </text>
          <text x="300" y="75" textAnchor="middle" fill="#00ff41" fillOpacity="0.3" fontSize="7" fontFamily="monospace">
            REV 2.0 | 64-BIT | MULTI-THREADED
          </text>

          {/* Two core modules inside the chip */}
          {/* Find the One core */}
          <rect x="198" y="90" width="100" height="70" rx="2" fill="rgba(236, 72, 153, 0.06)" stroke="#ec4899" strokeWidth="1" strokeOpacity="0.4" />
          <text x="248" y="107" textAnchor="middle" fill="#ec4899" fillOpacity="0.8" fontSize="7" fontFamily="monospace" fontWeight="700">
            CORE_0
          </text>
          <text x="248" y="120" textAnchor="middle" fill="#ec4899" fillOpacity="0.5" fontSize="6" fontFamily="monospace">
            FIND_THE_ONE
          </text>
          {/* Mini circuit traces inside */}
          <line x1="208" y1="132" x2="288" y2="132" stroke="#ec4899" strokeWidth="0.3" strokeOpacity="0.3" />
          <line x1="208" y1="138" x2="270" y2="138" stroke="#ec4899" strokeWidth="0.3" strokeOpacity="0.2" />
          <line x1="208" y1="144" x2="250" y2="144" stroke="#ec4899" strokeWidth="0.3" strokeOpacity="0.15" />
          {/* Core LED */}
          <circle cx="286" cy="98" r="2" fill="#ec4899" fillOpacity="0.6">
            <animate attributeName="fillOpacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Abundance core */}
          <rect x="302" y="90" width="100" height="70" rx="2" fill="rgba(249, 115, 22, 0.06)" stroke="#f97316" strokeWidth="1" strokeOpacity="0.4" />
          <text x="352" y="107" textAnchor="middle" fill="#f97316" fillOpacity="0.8" fontSize="7" fontFamily="monospace" fontWeight="700">
            CORE_1
          </text>
          <text x="352" y="120" textAnchor="middle" fill="#f97316" fillOpacity="0.5" fontSize="6" fontFamily="monospace">
            ABUNDANCE
          </text>
          {/* Mini circuit traces inside */}
          <line x1="312" y1="132" x2="392" y2="132" stroke="#f97316" strokeWidth="0.3" strokeOpacity="0.3" />
          <line x1="312" y1="138" x2="374" y2="138" stroke="#f97316" strokeWidth="0.3" strokeOpacity="0.2" />
          <line x1="312" y1="144" x2="354" y2="144" stroke="#f97316" strokeWidth="0.3" strokeOpacity="0.15" />
          {/* Core LED */}
          <circle cx="390" cy="98" r="2" fill="#f97316" fillOpacity="0.6">
            <animate attributeName="fillOpacity" values="0.3;0.8;0.3" dur="2.5s" repeatCount="indefinite" />
          </circle>

          {/* Internal bus between cores */}
          <line x1="298" y1="115" x2="302" y2="115" stroke="#00ff41" strokeWidth="2" strokeOpacity="0.3" />
          <line x1="298" y1="125" x2="302" y2="125" stroke="#00ff41" strokeWidth="1" strokeOpacity="0.2" />
          <line x1="298" y1="135" x2="302" y2="135" stroke="#00ff41" strokeWidth="1" strokeOpacity="0.2" />

          {/* Address bus at bottom of chip */}
          <line x1="198" y1="180" x2="398" y2="180" stroke="#00ff41" strokeWidth="0.5" strokeOpacity="0.2" />
          <text x="300" y="192" textAnchor="middle" fill="#00ff41" fillOpacity="0.25" fontSize="6" fontFamily="monospace">
            ADDR_BUS [31:0]
          </text>
          <text x="300" y="202" textAnchor="middle" fill="#00ff41" fillOpacity="0.25" fontSize="6" fontFamily="monospace">
            DATA_BUS [63:0]
          </text>

          {/* Pin grid on left side */}
          {Array.from({ length: 8 }, (_, i) => (
            <g key={`left-pin-${i}`}>
              <line x1="160" y1={55 + i * 25} x2="180" y2={55 + i * 25} stroke="#00ff41" strokeWidth="0.8" strokeOpacity="0.25" />
              <circle cx="159" cy={55 + i * 25} r="1.5" fill="#00ff41" fillOpacity="0.2" />
            </g>
          ))}

          {/* Pin grid on right side */}
          {Array.from({ length: 8 }, (_, i) => (
            <g key={`right-pin-${i}`}>
              <line x1="420" y1={55 + i * 25} x2="440" y2={55 + i * 25} stroke="#00ff41" strokeWidth="0.8" strokeOpacity="0.25" />
              <circle cx="441" cy={55 + i * 25} r="1.5" fill="#00ff41" fillOpacity="0.2" />
            </g>
          ))}

          {/* Bus traces to peripheral modules - left side */}
          {[0, 1, 2].map((i) => {
            const area = LIFE_AREAS[i + 1] // skip daygame (index 0)
            if (!area) return null
            const mod = MODULE_MAP[area.id] ?? { type: "MOD", address: "0xFF", status: "IDLE", color: "#9ca3af" }
            const y = 65 + i * 55
            const isPulsing = activePulses.includes(i + 1)
            return (
              <g key={`left-mod-${i}`}>
                {/* Trace */}
                <line x1="80" y1={y} x2="160" y2={y} stroke={mod.color} strokeWidth="0.8" strokeOpacity="0.2" />
                {/* 90-degree turn */}
                <line x1="60" y1={y} x2="80" y2={y} stroke={mod.color} strokeWidth="0.8" strokeOpacity="0.2" />
                {/* Module chip */}
                <rect x="10" y={y - 18} width="52" height="36" rx="2" fill="rgba(255,255,255,0.02)" stroke={mod.color} strokeWidth="0.8" strokeOpacity="0.3" />
                <text x="36" y={y - 5} textAnchor="middle" fill={mod.color} fillOpacity="0.7" fontSize="7" fontFamily="monospace" fontWeight="700">
                  {mod.type}
                </text>
                <text x="36" y={y + 5} textAnchor="middle" fill={mod.color} fillOpacity="0.4" fontSize="5" fontFamily="monospace">
                  {mod.address}
                </text>
                <text x="36" y={y + 14} textAnchor="middle" fill={mod.color} fillOpacity="0.3" fontSize="4" fontFamily="monospace">
                  {mod.status}
                </text>
                {/* Pulse dot */}
                {isPulsing && (
                  <circle cx="120" cy={y} r="2" fill={mod.color} fillOpacity="0.8" filter="url(#chip-glow)">
                    <animate attributeName="cx" values="80;155" dur="1s" repeatCount="1" />
                    <animate attributeName="fillOpacity" values="0;0.8;0" dur="1s" repeatCount="1" />
                  </circle>
                )}
              </g>
            )
          })}

          {/* Bus traces to peripheral modules - right side */}
          {[0, 1, 2].map((i) => {
            const areaIdx = i + 4
            const area = LIFE_AREAS[areaIdx]
            if (!area) return null
            const mod = MODULE_MAP[area.id] ?? { type: "MOD", address: "0xFF", status: "IDLE", color: "#9ca3af" }
            const y = 65 + i * 55
            const isPulsing = activePulses.includes(areaIdx)
            return (
              <g key={`right-mod-${i}`}>
                {/* Trace */}
                <line x1="440" y1={y} x2="520" y2={y} stroke={mod.color} strokeWidth="0.8" strokeOpacity="0.2" />
                <line x1="520" y1={y} x2="540" y2={y} stroke={mod.color} strokeWidth="0.8" strokeOpacity="0.2" />
                {/* Module chip */}
                <rect x="538" y={y - 18} width="52" height="36" rx="2" fill="rgba(255,255,255,0.02)" stroke={mod.color} strokeWidth="0.8" strokeOpacity="0.3" />
                <text x="564" y={y - 5} textAnchor="middle" fill={mod.color} fillOpacity="0.7" fontSize="7" fontFamily="monospace" fontWeight="700">
                  {mod.type}
                </text>
                <text x="564" y={y + 5} textAnchor="middle" fill={mod.color} fillOpacity="0.4" fontSize="5" fontFamily="monospace">
                  {mod.address}
                </text>
                <text x="564" y={y + 14} textAnchor="middle" fill={mod.color} fillOpacity="0.3" fontSize="4" fontFamily="monospace">
                  {mod.status}
                </text>
                {/* Pulse dot */}
                {isPulsing && (
                  <circle cx="480" cy={y} r="2" fill={mod.color} fillOpacity="0.8" filter="url(#chip-glow)">
                    <animate attributeName="cx" values="445;535" dur="1s" repeatCount="1" />
                    <animate attributeName="fillOpacity" values="0;0.8;0" dur="1s" repeatCount="1" />
                  </circle>
                )}
              </g>
            )
          })}

          {/* Bottom address bus spanning full width */}
          <line x1="10" y1="260" x2="590" y2="260" stroke="#00ff41" strokeWidth="1" strokeOpacity="0.1" />
          <line x1="10" y1="264" x2="590" y2="264" stroke="#00ff41" strokeWidth="0.5" strokeOpacity="0.07" />
          <text x="300" y="275" textAnchor="middle" fill="#00ff41" fillOpacity="0.15" fontSize="6" fontFamily="monospace">
            SYSTEM_BUS // ALL MODULES INTERCONNECTED
          </text>
        </svg>
      </div>

      {/* Two Main Path Selection — styled as core activation */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {/* Find The One */}
        <button
          onClick={() => onSelectPath("one_person")}
          className="group relative overflow-hidden text-left transition-all duration-300 cursor-pointer p-5"
          style={{
            border: "1px solid rgba(236, 72, 153, 0.2)",
            background: "rgba(236, 72, 153, 0.02)",
            borderRadius: 4,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(236, 72, 153, 0.5)"
            e.currentTarget.style.boxShadow = "0 0 30px rgba(236, 72, 153, 0.1), inset 0 0 30px rgba(236, 72, 153, 0.03)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(236, 72, 153, 0.2)"
            e.currentTarget.style.boxShadow = "none"
          }}
        >
          {/* Scanline overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(236, 72, 153, 0.02) 2px, rgba(236, 72, 153, 0.02) 4px)",
            }}
          />
          <div className="relative space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 flex items-center justify-center"
                  style={{
                    backgroundColor: "rgba(236, 72, 153, 0.08)",
                    border: "1px solid rgba(236, 72, 153, 0.2)",
                    borderRadius: 2,
                  }}
                >
                  <Heart className="size-5 text-pink-400" />
                </div>
                <div>
                  <div
                    className="text-xs font-bold tracking-wider"
                    style={{
                      fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                      color: "#ec4899",
                      textTransform: "uppercase",
                    }}
                  >
                    CORE_0 // ACTIVATE
                  </div>
                  <div
                    className="text-sm font-bold mt-0.5"
                    style={{ color: "rgba(255, 255, 255, 0.85)" }}
                  >
                    Find the One
                  </div>
                </div>
              </div>
              {/* Status LED */}
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-400" style={{ boxShadow: "0 0 4px #ec4899" }} />
                <span
                  className="text-[9px] font-bold"
                  style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    color: "rgba(236, 72, 153, 0.5)",
                  }}
                >
                  READY
                </span>
              </div>
            </div>
            <p
              className="text-xs"
              style={{
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                color: "rgba(255, 255, 255, 0.35)",
              }}
            >
              Connection-focused pipeline. Optimize for depth, commitment, relationship outcomes.
            </p>
            <div className="space-y-1">
              {onePerson.slice(0, 3).map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-2 text-[10px]"
                  style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    color: "rgba(236, 72, 153, 0.4)",
                  }}
                >
                  <span style={{ color: "rgba(236, 72, 153, 0.3)" }}>&gt;</span>
                  {g.title}
                </div>
              ))}
              {onePerson.length > 3 && (
                <div
                  className="text-[10px] pl-4"
                  style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    color: "rgba(236, 72, 153, 0.3)",
                  }}
                >
                  +{onePerson.length - 3} more directives
                </div>
              )}
            </div>
            <div
              className="flex items-center gap-1.5 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                color: "#ec4899",
              }}
            >
              INITIALIZE &gt;&gt;
              <ChevronRight className="size-3.5" />
            </div>
          </div>
        </button>

        {/* Abundance */}
        <button
          onClick={() => onSelectPath("abundance")}
          className="group relative overflow-hidden text-left transition-all duration-300 cursor-pointer p-5"
          style={{
            border: "1px solid rgba(249, 115, 22, 0.2)",
            background: "rgba(249, 115, 22, 0.02)",
            borderRadius: 4,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(249, 115, 22, 0.5)"
            e.currentTarget.style.boxShadow = "0 0 30px rgba(249, 115, 22, 0.1), inset 0 0 30px rgba(249, 115, 22, 0.03)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(249, 115, 22, 0.2)"
            e.currentTarget.style.boxShadow = "none"
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(249, 115, 22, 0.02) 2px, rgba(249, 115, 22, 0.02) 4px)",
            }}
          />
          <div className="relative space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 flex items-center justify-center"
                  style={{
                    backgroundColor: "rgba(249, 115, 22, 0.08)",
                    border: "1px solid rgba(249, 115, 22, 0.2)",
                    borderRadius: 2,
                  }}
                >
                  <Flame className="size-5 text-orange-400" />
                </div>
                <div>
                  <div
                    className="text-xs font-bold tracking-wider"
                    style={{
                      fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                      color: "#f97316",
                      textTransform: "uppercase",
                    }}
                  >
                    CORE_1 // ACTIVATE
                  </div>
                  <div
                    className="text-sm font-bold mt-0.5"
                    style={{ color: "rgba(255, 255, 255, 0.85)" }}
                  >
                    Abundance
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400" style={{ boxShadow: "0 0 4px #f97316" }} />
                <span
                  className="text-[9px] font-bold"
                  style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    color: "rgba(249, 115, 22, 0.5)",
                  }}
                >
                  READY
                </span>
              </div>
            </div>
            <p
              className="text-xs"
              style={{
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                color: "rgba(255, 255, 255, 0.35)",
              }}
            >
              Volume-focused pipeline. Optimize for variety, freedom, dating throughput.
            </p>
            <div className="space-y-1">
              {abundance.slice(0, 3).map((g) => (
                <div
                  key={g.id}
                  className="flex items-center gap-2 text-[10px]"
                  style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    color: "rgba(249, 115, 22, 0.4)",
                  }}
                >
                  <span style={{ color: "rgba(249, 115, 22, 0.3)" }}>&gt;</span>
                  {g.title}
                </div>
              ))}
              {abundance.length > 3 && (
                <div
                  className="text-[10px] pl-4"
                  style={{
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    color: "rgba(249, 115, 22, 0.3)",
                  }}
                >
                  +{abundance.length - 3} more directives
                </div>
              )}
            </div>
            <div
              className="flex items-center gap-1.5 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                color: "#f97316",
              }}
            >
              INITIALIZE &gt;&gt;
              <ChevronRight className="size-3.5" />
            </div>
          </div>
        </button>
      </div>

      {/* System manifest table */}
      <div className="max-w-3xl mx-auto">
        <div
          className="text-[10px] font-bold tracking-wider mb-2"
          style={{
            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
            color: "rgba(0, 255, 65, 0.3)",
            textTransform: "uppercase",
          }}
        >
          // SYSTEM MANIFEST
        </div>
        <div
          className="overflow-hidden"
          style={{
            border: "1px solid rgba(0, 255, 65, 0.1)",
            borderRadius: 2,
          }}
        >
          <table className="w-full" style={{ fontFamily: "var(--font-mono, 'Geist Mono', monospace)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0, 255, 65, 0.1)" }}>
                {["ADDR", "MODULE", "TYPE", "STATUS"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-1.5 text-[9px] font-bold tracking-wider"
                    style={{ color: "rgba(0, 255, 65, 0.35)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LIFE_AREAS.filter((a) => a.id !== "custom").map((area) => {
                const mod = MODULE_MAP[area.id] ?? { type: "MOD", address: "0xFF", status: "IDLE", color: "#9ca3af" }
                const isOnline = mod.status === "ONLINE"
                return (
                  <tr
                    key={area.id}
                    style={{
                      borderBottom: "1px solid rgba(0, 255, 65, 0.05)",
                      backgroundColor: isOnline ? "rgba(0, 255, 65, 0.03)" : "transparent",
                    }}
                  >
                    <td className="px-3 py-1.5 text-[10px]" style={{ color: "rgba(0, 255, 65, 0.4)" }}>
                      {mod.address}
                    </td>
                    <td className="px-3 py-1.5 text-[10px] font-semibold" style={{ color: mod.color + "cc" }}>
                      {area.name}
                    </td>
                    <td className="px-3 py-1.5 text-[10px]" style={{ color: "rgba(0, 255, 65, 0.4)" }}>
                      {mod.type}
                    </td>
                    <td className="px-3 py-1.5">
                      <span
                        className="inline-flex items-center gap-1 text-[9px] font-bold"
                        style={{ color: isOnline ? "#00ff41" : "rgba(0, 255, 65, 0.25)" }}
                      >
                        <span
                          className="w-1 h-1 rounded-full"
                          style={{
                            backgroundColor: isOnline ? "#00ff41" : "rgba(0, 255, 65, 0.2)",
                            boxShadow: isOnline ? "0 0 3px #00ff41" : "none",
                          }}
                        />
                        {mod.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
