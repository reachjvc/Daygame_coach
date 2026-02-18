"use client"

import { useState, useEffect } from "react"

/** Marine snow particles drifting upward */
function MarineSnow() {
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; size: number; delay: number; duration: number; opacity: number; drift: number }[]
  >([])

  useEffect(() => {
    setParticles(
      Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 0.5,
        delay: Math.random() * 15,
        duration: Math.random() * 12 + 8,
        opacity: Math.random() * 0.3 + 0.05,
        drift: (Math.random() - 0.5) * 20,
      }))
    )
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            bottom: `-5%`,
            width: p.size,
            height: p.size,
            backgroundColor: `rgba(180, 220, 255, ${p.opacity})`,
            animation: `marineSnowRise ${p.duration}s linear ${p.delay}s infinite`,
            filter: p.size > 2 ? "blur(0.5px)" : "none",
            ["--drift" as string]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  )
}

/** Caustic light patterns rippling across the background */
function CausticOverlay() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0, opacity: 0.04 }}>
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 25% 30%, rgba(0, 255, 255, 0.5) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 75% 60%, rgba(0, 102, 255, 0.4) 0%, transparent 50%),
            radial-gradient(ellipse 70% 45% at 50% 80%, rgba(0, 255, 136, 0.3) 0%, transparent 55%)
          `,
          animation: "causticShift 20s ease-in-out infinite",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 50% 60% at 60% 20%, rgba(0, 255, 255, 0.4) 0%, transparent 50%),
            radial-gradient(ellipse 70% 30% at 30% 70%, rgba(255, 0, 255, 0.2) 0%, transparent 60%)
          `,
          animation: "causticShift2 15s ease-in-out 3s infinite",
        }}
      />
    </div>
  )
}

/** Deep ocean background with particles and caustics */
export function OceanCanvas({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-[600px] rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #000810 0%, #000c18 20%, #001020 50%, #000a15 80%, #000810 100%)",
        color: "white",
      }}
      data-testid="variant-c"
    >
      <CausticOverlay />
      <MarineSnow />

      {/* Content layer */}
      <div className="relative" style={{ zIndex: 2 }}>
        {children}
      </div>

      {/* Global keyframes */}
      <style>{`
        @keyframes marineSnowRise {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 0.4;
          }
          90% {
            opacity: 0.2;
          }
          100% {
            transform: translateY(-110vh) translateX(var(--drift, 0px));
            opacity: 0;
          }
        }

        @keyframes causticShift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(3%, -2%) scale(1.05); }
          50% { transform: translate(-2%, 3%) scale(0.95); }
          75% { transform: translate(2%, 1%) scale(1.02); }
        }

        @keyframes causticShift2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(-3%, 2%) rotate(2deg); }
          66% { transform: translate(2%, -3%) rotate(-1deg); }
        }

        @keyframes bioFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        @keyframes bioFloatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }

        @keyframes bioFloatGentle {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(1deg); }
        }

        @keyframes bioPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        @keyframes bioPulseGlow {
          0%, 100% { box-shadow: 0 0 15px var(--glow-color, rgba(0,255,255,0.3)), 0 0 30px var(--glow-color, rgba(0,255,255,0.15)); }
          50% { box-shadow: 0 0 25px var(--glow-color, rgba(0,255,255,0.5)), 0 0 50px var(--glow-color, rgba(0,255,255,0.25)); }
        }

        @keyframes tentacleSway {
          0%, 100% { transform: rotate(-3deg) scaleY(1); }
          50% { transform: rotate(3deg) scaleY(1.05); }
        }

        @keyframes colonyPulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }

        @keyframes depthGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
