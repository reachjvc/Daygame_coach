"use client"

import Link from "next/link"
import { ArrowLeft, Sparkles } from "lucide-react"

const variants = [
  {
    id: "A",
    href: "/test/goalsv7/a",
    name: "Cosmic Particles",
    description:
      "Flat hierarchy with particle field background, glassmorphism cards, enhanced orrery with comet trails",
  },
  {
    id: "B",
    href: "/test/goalsv7/b",
    name: "Northern Lights Reimagined",
    description:
      "Aurora constrained to edges, morphing card borders, holographic shimmer, animated orrery",
  },
  {
    id: "C",
    href: "/test/goalsv7/c",
    name: "Liquid Void",
    description:
      "Deep bioluminescent theme, liquid morphing animations, gravity well visualization",
  },
  {
    id: "D",
    href: "/test/goalsv7/d",
    name: "Ember Forge",
    description:
      "Warm forge/fire aesthetic with ember particles, brass accents, mechanical astrolabe",
  },
]

export default function GoalsV7HubPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-8 py-12">
        <div className="mb-8">
          <Link
            href="/test"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="size-4" />
            Back to Test Pages
          </Link>
          <div className="flex items-center gap-3">
            <Sparkles className="size-7 text-primary" />
            <h1 className="text-2xl font-bold">Goal Flow V7</h1>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            4 creative variants with improved aurora, enhanced animations, and
            cohesive theming.
          </p>
        </div>

        <div className="grid gap-3">
          {variants.map((v) => (
            <Link
              key={v.id}
              href={v.href}
              className="group flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary hover:bg-card/80"
            >
              <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {v.id}
              </div>
              <div>
                <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {v.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {v.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
