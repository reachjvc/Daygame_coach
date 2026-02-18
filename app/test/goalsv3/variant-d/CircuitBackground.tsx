"use client"

import { useState, useEffect } from "react"

/**
 * PCB grid background with animated data pulses traveling along circuit traces.
 * Layered behind all content. Pure decoration.
 */
export function CircuitBackground() {
  const [pulses, setPulses] = useState<
    { id: number; x1: number; y1: number; x2: number; y2: number; delay: number; duration: number; color: string }[]
  >([])

  useEffect(() => {
    // Generate random circuit trace pulses
    const generated = Array.from({ length: 18 }, (_, i) => {
      const isHorizontal = Math.random() > 0.5
      const start = Math.random() * 100
      const track = Math.random() * 100
      return {
        id: i,
        x1: isHorizontal ? 0 : track,
        y1: isHorizontal ? track : 0,
        x2: isHorizontal ? 100 : track,
        y2: isHorizontal ? track : 100,
        delay: Math.random() * 8,
        duration: 3 + Math.random() * 4,
        color: i % 5 === 0 ? "#00e5ff" : i % 7 === 0 ? "#ffab00" : "#00ff41",
      }
    })
    setPulses(generated)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* PCB Grid pattern */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="pcb-grid-small" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#00ff41" strokeWidth="0.3" strokeOpacity="0.06" />
          </pattern>
          <pattern id="pcb-grid-large" width="80" height="80" patternUnits="userSpaceOnUse">
            <rect width="80" height="80" fill="url(#pcb-grid-small)" />
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#00ff41" strokeWidth="0.5" strokeOpacity="0.1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pcb-grid-large)" />

        {/* Power rails — top and bottom */}
        <line x1="0" y1="12" x2="100%" y2="12" stroke="#00ff41" strokeWidth="2" strokeOpacity="0.08" />
        <line x1="0" y1="16" x2="100%" y2="16" stroke="#00ff41" strokeWidth="1" strokeOpacity="0.05" />
        <text x="8" y="11" fill="#00ff41" fillOpacity="0.12" fontSize="6" fontFamily="monospace">+3.3V</text>

        <line x1="0" y1="99%" x2="100%" y2="99%" stroke="#00ff41" strokeWidth="2" strokeOpacity="0.08" />
        <line x1="0" y1="97%" x2="100%" y2="97%" stroke="#00ff41" strokeWidth="1" strokeOpacity="0.05" />
        <text x="8" y="98%" fill="#00ff41" fillOpacity="0.12" fontSize="6" fontFamily="monospace">GND</text>
      </svg>

      {/* Solder point dots at grid intersections */}
      {Array.from({ length: 30 }, (_, i) => {
        const col = (i % 6) * 20 + 10
        const row = Math.floor(i / 6) * 20 + 15
        return (
          <div
            key={`solder-${i}`}
            className="absolute rounded-full"
            style={{
              left: `${col}%`,
              top: `${row}%`,
              width: 2,
              height: 2,
              backgroundColor: "#00ff41",
              opacity: 0.15,
              boxShadow: "0 0 3px #00ff41",
            }}
          />
        )
      })}

      {/* Animated data pulses on traces */}
      {pulses.map((pulse) => (
        <div
          key={pulse.id}
          className="absolute rounded-full"
          style={{
            width: 3,
            height: 3,
            backgroundColor: pulse.color,
            boxShadow: `0 0 6px ${pulse.color}, 0 0 12px ${pulse.color}40`,
            opacity: 0.7,
            animation: `circuit-pulse-${pulse.id} ${pulse.duration}s linear ${pulse.delay}s infinite`,
          }}
        />
      ))}

      <style>{`
        ${pulses
          .map(
            (p) => `
          @keyframes circuit-pulse-${p.id} {
            0% { left: ${p.x1}%; top: ${p.y1}%; opacity: 0; }
            5% { opacity: 0.8; }
            95% { opacity: 0.8; }
            100% { left: ${p.x2}%; top: ${p.y2}%; opacity: 0; }
          }
        `
          )
          .join("\n")}
      `}</style>
    </div>
  )
}
