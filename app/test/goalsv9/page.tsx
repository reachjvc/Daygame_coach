"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"

const VARIANTS = [
  {
    id: "A",
    title: "Living Nebula",
    description: "Flowing nebula clouds react to user state. Plasma sun with eruptions. Gas clouds pulse behind orbits.",
    gradient: "from-purple-500 to-pink-500",
    href: "/test/goalsv9/a",
  },
  {
    id: "B",
    title: "Deep Ocean",
    description: "Bioluminescent deep-sea theme. Jellyfish particles, glowing coral system. Dark blue/cyan palette.",
    gradient: "from-cyan-600 to-blue-900",
    href: "/test/goalsv9/b",
  },
  {
    id: "C",
    title: "Aurora Borealis",
    description: "Rich aurora curtains sweep across the sky. Solar system embedded in flowing northern lights ribbons.",
    gradient: "from-green-400 to-cyan-500",
    href: "/test/goalsv9/c",
  },
  {
    id: "D",
    title: "Cosmic Web",
    description: "Gravitational lensing around the sun. Dark matter filaments connect planets. Gravitational waves ripple outward.",
    gradient: "from-indigo-500 to-violet-600",
    href: "/test/goalsv9/d",
  },
]

export default function GoalsV9Hub() {
  return (
    <div className="min-h-screen bg-[#050510] text-white p-6">
      <button
        onClick={() => window.history.back()}
        className="fixed top-4 left-4 z-50 flex items-center gap-1.5 rounded-lg bg-background/80 backdrop-blur border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors shadow-lg"
      >
        <ArrowLeft className="size-4" />
        Back
      </button>

      <div className="mx-auto max-w-4xl pt-16">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
          Goals V9 — Visual Directions
        </h1>
        <p className="text-white/40 text-sm mb-8">
          4 different visual approaches for backgrounds and the &quot;Your System&quot; orrery.
          Same functional base (V8), different visual identity.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {VARIANTS.map((v) => (
            <Link
              key={v.id}
              href={v.href}
              className="group rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: "rgba(15, 15, 35, 0.6)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div className={`h-2 bg-gradient-to-r ${v.gradient}`} />
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`size-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${v.gradient} text-white font-bold text-lg`}
                  >
                    {v.id}
                  </div>
                  <h2 className="text-lg font-semibold text-white group-hover:text-cyan-300 transition-colors">
                    {v.title}
                  </h2>
                </div>
                <p className="text-sm text-white/40 leading-relaxed">{v.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
