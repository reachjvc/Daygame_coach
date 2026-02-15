"use client"

import { useState } from "react"
import { Compass, ChevronDown } from "lucide-react"
import { PRINCIPLES, PRINCIPLE_CATEGORIES } from "../data/principles"

/**
 * Displays the 25 evidence-based principles for effective reflection
 * Features:
 * - Hero section with overall stats
 * - Category filter for browsing
 * - Expandable principle cards with full research details
 */
export function PrinciplesSection() {
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [expandedPrinciple, setExpandedPrinciple] = useState<string | null>(null)

  const filteredPrinciples = activeCategory === "all"
    ? PRINCIPLES
    : PRINCIPLES.filter(p => p.category === activeCategory)

  const categoryStats = PRINCIPLE_CATEGORIES.map(cat => ({
    ...cat,
    count: PRINCIPLES.filter(p => p.category === cat.id).length
  }))

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-card to-accent/10 border border-primary/30 p-8 md:p-12">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <Compass className="size-7" />
            </div>
            <div>
              <p className="text-primary font-semibold text-sm uppercase tracking-wider">The Science</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">Why Field Reports Work</h2>
            </div>
          </div>

          <p className="text-lg text-foreground/80 max-w-2xl mb-6">
            These aren&apos;t random tips. They&apos;re <span className="text-primary font-semibold">25 evidence-based principles</span> from
            military training, sports psychology, cognitive science, and habit research—distilled into actionable guidelines.
          </p>

          {/* Quick stats row */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-foreground/70"><span className="text-foreground font-bold">15+</span> research domains</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-foreground/70"><span className="text-foreground font-bold">200+</span> studies referenced</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-foreground/70"><span className="text-foreground font-bold">35+</span> years of goal-setting research</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Browse by Category</h3>
          <span className="text-sm text-muted-foreground">{filteredPrinciples.length} principles</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeCategory === "all"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                : "bg-card border border-border text-foreground/70 hover:border-primary/50 hover:text-foreground"
            }`}
          >
            All ({PRINCIPLES.length})
          </button>
          {categoryStats.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-card border border-border text-foreground/70 hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>

        {/* Category description */}
        {activeCategory !== "all" && (
          <p className="text-muted-foreground text-sm pl-1">
            {PRINCIPLE_CATEGORIES.find(c => c.id === activeCategory)?.description}
          </p>
        )}
      </div>

      {/* Principles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPrinciples.map((principle) => {
          const isExpanded = expandedPrinciple === principle.id
          return (
            <div
              key={principle.id}
              onClick={() => setExpandedPrinciple(isExpanded ? null : principle.id)}
              className={`
                rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 bg-card border
                ${isExpanded
                  ? "border-primary/50 shadow-xl shadow-primary/10 md:col-span-2"
                  : "border-border hover:border-primary/30 hover:shadow-lg"
                }
              `}
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl transition-colors ${isExpanded ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                    {principle.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">#{principle.number}</span>
                      <span className="px-2 py-0.5 rounded text-xs bg-secondary text-muted-foreground capitalize">
                        {PRINCIPLE_CATEGORIES.find(c => c.id === principle.category)?.name}
                      </span>
                    </div>
                    <h4 className="font-bold text-foreground text-lg leading-tight">{principle.title}</h4>
                  </div>
                  <ChevronDown className={`size-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>

                {/* Insight quote - always visible */}
                {principle.insight && (
                  <div className="mt-4 pl-16">
                    <p className="text-primary font-medium italic">&ldquo;{principle.insight}&rdquo;</p>
                  </div>
                )}

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-border animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Description */}
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">The Principle</h5>
                        <p className="text-foreground/80 leading-relaxed">{principle.description}</p>
                      </div>

                      {/* Meta info */}
                      <div className="space-y-4">
                        {/* Research stat */}
                        {principle.stat && (
                          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                            <h5 className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Research Finding</h5>
                            <p className="text-foreground font-semibold">{principle.stat}</p>
                          </div>
                        )}

                        {/* Source */}
                        <div>
                          <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Source</h5>
                          <p className="text-foreground/70">{principle.source}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
