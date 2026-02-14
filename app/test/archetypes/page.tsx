"use client"

import { useState } from "react"

type Choice = "existing" | "new" | "newA" | "newB" | null

interface Overlap {
  id: number
  label: string
  archetype: string
  age: string
  existing?: { path: string; desc: string }
  newA: { path: string; desc: string; key: string }
  newB?: { path: string; desc: string; key: string }
}

const overlaps: Overlap[] = [
  {
    id: 1,
    label: "Corporate Powerhouse — age 18",
    archetype: "corporate-powerhouse",
    age: "18",
    existing: {
      path: "/archetypes/18/powerhouse_scandinavian.jpg",
      desc: "Full body, walking on street with phone, navy blazer",
    },
    newA: {
      path: "/new%20archetypes/scandinavian-woman-18.jpg",
      desc: "Close-up portrait, navy blazer, pearl earrings, office",
      key: "scandinavian-woman-18.jpg",
    },
  },
  {
    id: 2,
    label: "Corporate Powerhouse — age 37 (two new, no existing)",
    archetype: "corporate-powerhouse",
    age: "37",
    newA: {
      path: "/new%20archetypes/corporate-powerhouse-age-37.jpg",
      desc: "Blonde bob, diamond studs, high-rise glass office",
      key: "corporate-powerhouse-age-37.jpg",
    },
    newB: {
      path: "/new%20archetypes/scandinavian-woman-37.jpg",
      desc: "Hair pulled back, pearl earrings, similar office variant",
      key: "scandinavian-woman-37.jpg",
    },
  },
  {
    id: 3,
    label: "Disciplined Athlete — age 25",
    archetype: "disciplined-athlete",
    age: "25",
    existing: {
      path: "/archetypes/25/disciplined-athlete.jpg",
      desc: "Tanned, dark sports bra, ponytail, outdoor sunshine",
    },
    newA: {
      path: "/new%20archetypes/disciplined-athlete-age-25.jpg",
      desc: "Braided hair, grey athletic zip, smartwatch, gym entrance",
      key: "disciplined-athlete-age-25.jpg",
    },
  },
  {
    id: 4,
    label: "Disciplined Athlete — age 30",
    archetype: "disciplined-athlete",
    age: "30",
    existing: {
      path: "/archetypes/30/disciplined-athlete.jpg",
      desc: "Blonde in blazer over gym top, office/gym hybrid",
    },
    newA: {
      path: "/new%20archetypes/disciplined-athlete-age-30.jpg",
      desc: "Bun + headband, maroon tank, running track by waterfront",
      key: "disciplined-athlete-age-30.jpg",
    },
  },
  {
    id: 5,
    label: "Ethereal Creative — age 25",
    archetype: "ethereal-creative",
    age: "25",
    existing: {
      path: "/archetypes/25/ethereal-creative.jpg",
      desc: "Curly auburn hair, embroidered bohemian blouse, boho interior",
    },
    newA: {
      path: "/new%20archetypes/ethereal-creative-age-25.jpg",
      desc: "Redhead, messy bun, paisley scarf + notebook, art gallery",
      key: "ethereal-creative-age-25.jpg",
    },
  },
  {
    id: 6,
    label: "Ethereal Creative — age 30",
    archetype: "ethereal-creative",
    age: "30",
    existing: {
      path: "/archetypes/30/ethereal-creative.jpg",
      desc: "Dark curly hair, nose ring, boho necklace, artistic profile",
    },
    newA: {
      path: "/new%20archetypes/ethereal-creative-age-30.jpg",
      desc: "Blonde side braid, rust one-shoulder dress, warm cafe",
      key: "ethereal-creative-age-30.jpg",
    },
  },
  {
    id: 7,
    label: "Modern Traditionalist — age 25",
    archetype: "modern-traditionalist",
    age: "25",
    existing: {
      path: "/archetypes/25/modern-traditionalist.jpg",
      desc: "Brunette, cream lace blouse, modest/elegant, soft indoor",
    },
    newA: {
      path: "/new%20archetypes/modern-traditionalist-age-25.jpg",
      desc: "Blonde, cream V-neck blouse, elegant restaurant",
      key: "modern-traditionalist-age-25.jpg",
    },
  },
]

export default function ArchetypePickerPage() {
  const [choices, setChoices] = useState<Record<number, Choice>>({})

  const setChoice = (id: number, choice: Choice) => {
    setChoices((prev) => ({ ...prev, [id]: choice }))
  }

  const allDecided = overlaps.every((o) => choices[o.id] != null)

  const buildOutput = () => {
    return overlaps
      .map((o) => {
        const c = choices[o.id]
        if (!c) return `${o.id}. ${o.label}: UNDECIDED`
        if (c === "existing") return `${o.id}. ${o.label}: KEEP EXISTING`
        if (c === "new") return `${o.id}. ${o.label}: REPLACE WITH NEW (${o.newA.key})`
        if (c === "newA") return `${o.id}. ${o.label}: USE OPTION A (${o.newA.key})`
        if (c === "newB") return `${o.id}. ${o.label}: USE OPTION B (${o.newB?.key})`
        return ""
      })
      .join("\n")
  }

  const selected = (id: number, choice: Choice) =>
    choices[id] === choice
      ? "ring-4 ring-green-400 scale-[1.02]"
      : "ring-1 ring-zinc-700 opacity-60 hover:opacity-100"

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Archetype Image Picker</h1>
      <p className="text-zinc-400 mb-8">
        Click an image to pick it. When done, copy the result and paste it to me.
      </p>

      {overlaps.map((o) => (
        <div key={o.id} className="mb-12 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold mb-1">
            #{o.id}: {o.label}
          </h2>
          <p className="text-xs text-zinc-500 mb-4">
            {choices[o.id] ? `Selected: ${choices[o.id]?.toUpperCase()}` : "Click to pick"}
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Left side: existing or option A */}
            {o.existing ? (
              <button
                onClick={() => setChoice(o.id, "existing")}
                className={`rounded-lg overflow-hidden transition-all cursor-pointer ${selected(o.id, "existing")}`}
              >
                <img src={o.existing.path} alt="existing" className="w-full aspect-square object-cover" />
                <div className="p-2 bg-zinc-900 text-sm">
                  <span className="font-medium text-blue-400">EXISTING</span>
                  <p className="text-zinc-400 text-xs mt-1">{o.existing.desc}</p>
                </div>
              </button>
            ) : (
              <button
                onClick={() => setChoice(o.id, "newA")}
                className={`rounded-lg overflow-hidden transition-all cursor-pointer ${selected(o.id, "newA")}`}
              >
                <img src={o.newA.path} alt="option A" className="w-full aspect-square object-cover" />
                <div className="p-2 bg-zinc-900 text-sm">
                  <span className="font-medium text-green-400">OPTION A</span>
                  <p className="text-zinc-400 text-xs mt-1">{o.newA.desc}</p>
                </div>
              </button>
            )}

            {/* Right side: new or option B */}
            {o.newB ? (
              <button
                onClick={() => setChoice(o.id, "newB")}
                className={`rounded-lg overflow-hidden transition-all cursor-pointer ${selected(o.id, "newB")}`}
              >
                <img src={o.newB.path} alt="option B" className="w-full aspect-square object-cover" />
                <div className="p-2 bg-zinc-900 text-sm">
                  <span className="font-medium text-green-400">OPTION B</span>
                  <p className="text-zinc-400 text-xs mt-1">{o.newB.desc}</p>
                </div>
              </button>
            ) : (
              <button
                onClick={() => setChoice(o.id, "new")}
                className={`rounded-lg overflow-hidden transition-all cursor-pointer ${selected(o.id, "new")}`}
              >
                <img src={o.newA.path} alt="new" className="w-full aspect-square object-cover" />
                <div className="p-2 bg-zinc-900 text-sm">
                  <span className="font-medium text-green-400">NEW (Scandinavian)</span>
                  <p className="text-zinc-400 text-xs mt-1">{o.newA.desc}</p>
                </div>
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Output */}
      <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-800 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm text-zinc-400">
            {Object.keys(choices).length}/{overlaps.length} decided
          </span>
          {allDecided && <span className="text-green-400 text-sm font-medium">All done!</span>}
        </div>
        <textarea
          readOnly
          value={buildOutput()}
          rows={9}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm font-mono text-zinc-300 mb-3"
        />
        <button
          onClick={() => navigator.clipboard.writeText(buildOutput())}
          className="bg-green-600 hover:bg-green-500 text-white font-medium px-5 py-2 rounded-lg transition-colors"
        >
          Copy to clipboard
        </button>
      </div>
    </div>
  )
}
