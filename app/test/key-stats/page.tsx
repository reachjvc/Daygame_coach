"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { KEY_STATS_DATA } from "@/src/tracking/data/keyStats"
import { KEY_STATS_ENHANCED } from "@/src/tracking/data/keyStatsEnhanced"
import { KEY_STATS_CREATIVE } from "@/src/tracking/data/keyStatsCreative"
import { KEY_STATS_HYBRID } from "@/src/tracking/data/keyStatsHybrid"
import type { KeyStat } from "@/src/tracking/types"

const TIMER_DURATION = 20 // seconds

type VariationType = "original" | "enhanced" | "creative" | "hybrid"

const VARIATIONS: { id: VariationType; label: string; description: string; data: KeyStat[] }[] = [
  {
    id: "original",
    label: "Original",
    description: "Current production version",
    data: KEY_STATS_DATA,
  },
  {
    id: "hybrid",
    label: "Hybrid",
    description: "Best of all: original structure + enhanced stats + creative hooks",
    data: KEY_STATS_HYBRID,
  },
  {
    id: "enhanced",
    label: "Enhanced",
    description: "More supporting facts added to each stat",
    data: KEY_STATS_ENHANCED,
  },
  {
    id: "creative",
    label: "Creative",
    description: "Reframed with fresh angles & provocative framing",
    data: KEY_STATS_CREATIVE,
  },
]

function getCometPosition(
  progress: number,
  width: number,
  height: number
): { x: number; y: number } {
  const padding = 2
  const w = width - padding * 2
  const h = height - padding * 2
  const halfW = w / 2
  const totalLength = 2 * w + 2 * h
  const p = (progress % 1) * totalLength

  if (p < halfW) {
    return { x: width / 2 - p, y: height - padding }
  } else if (p < halfW + h) {
    return { x: padding, y: height - padding - (p - halfW) }
  } else if (p < halfW + h + w) {
    return { x: padding + (p - halfW - h), y: padding }
  } else if (p < halfW + h + w + h) {
    return { x: width - padding, y: padding + (p - halfW - h - w) }
  } else {
    return { x: width - padding - (p - halfW - h - w - h), y: height - padding }
  }
}

function KeyStatsSectionWithData({ stats }: { stats: KeyStat[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isUserInteracting, setIsUserInteracting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [cardDimensions, setCardDimensions] = useState({ width: 0, height: 0, perimeter: 0 })
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const detailsRef = useRef<HTMLDetailsElement>(null)

  // Reset active index when stats change
  useEffect(() => {
    setActiveIndex(0)
    setIsUserInteracting(false)
    if (detailsRef.current) {
      detailsRef.current.open = false
    }
  }, [stats])

  useEffect(() => {
    const measureCard = () => {
      if (cardRef.current) {
        const { width, height } = cardRef.current.getBoundingClientRect()
        const perimeter = 2 * (width + height)
        setCardDimensions({ width, height, perimeter })
      }
    }
    measureCard()
    window.addEventListener('resize', measureCard)
    return () => window.removeEventListener('resize', measureCard)
  }, [])

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp
      }

      const elapsed = timestamp - startTimeRef.current
      const newProgress = Math.min(elapsed / (TIMER_DURATION * 1000), 1)
      setProgress(newProgress)

      if (newProgress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        if (!isUserInteracting) {
          setActiveIndex((prev) => (prev + 1) % stats.length)
        }
        startTimeRef.current = null
        setProgress(0)
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isUserInteracting, stats.length])

  const toggleDetails = () => {
    if (detailsRef.current) {
      const newOpen = !detailsRef.current.open
      detailsRef.current.open = newOpen
      setIsUserInteracting(newOpen)
    }
  }

  const handleStatClick = (index: number) => {
    if (index === activeIndex) {
      toggleDetails()
    } else {
      setActiveIndex(index)
      if (detailsRef.current) {
        detailsRef.current.open = true
      }
      setIsUserInteracting(true)
    }
  }

  const handleMainCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('summary')) {
      return
    }
    toggleDetails()
  }

  const handleDetailsToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const isOpen = (e.target as HTMLDetailsElement).open
    setIsUserInteracting(isOpen)
  }

  const activeStat = stats[activeIndex]
  const otherStats = [
    ...stats.slice(activeIndex + 1),
    ...stats.slice(0, activeIndex),
  ]
  const nextIndex = (activeIndex + 1) % stats.length

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-primary font-semibold uppercase tracking-wider mb-1">Research-Backed</p>
        <h2 className="text-2xl font-bold text-foreground">Why This Works</h2>
      </div>

      <div
        ref={cardRef}
        className="relative w-full rounded-2xl cursor-pointer"
        onClick={handleMainCardClick}
      >
        {cardDimensions.perimeter > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            viewBox={`0 0 ${cardDimensions.width} ${cardDimensions.height}`}
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="cometGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="anchorGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect
              x="2"
              y="2"
              width={cardDimensions.width - 4}
              height={cardDimensions.height - 4}
              rx="14"
              ry="14"
              fill="none"
              className="stroke-primary/10"
              strokeWidth="1.5"
            />
            <circle
              cx={cardDimensions.width / 2}
              cy={cardDimensions.height - 2}
              r="4"
              className="fill-primary/60"
              filter="url(#anchorGlow)"
            />
            <>
              <circle
                cx={getCometPosition(progress - 0.06, cardDimensions.width, cardDimensions.height).x}
                cy={getCometPosition(progress - 0.06, cardDimensions.width, cardDimensions.height).y}
                r="2"
                className="fill-primary/15"
              />
              <circle
                cx={getCometPosition(progress - 0.04, cardDimensions.width, cardDimensions.height).x}
                cy={getCometPosition(progress - 0.04, cardDimensions.width, cardDimensions.height).y}
                r="2.5"
                className="fill-primary/30"
              />
              <circle
                cx={getCometPosition(progress - 0.02, cardDimensions.width, cardDimensions.height).x}
                cy={getCometPosition(progress - 0.02, cardDimensions.width, cardDimensions.height).y}
                r="3.5"
                className="fill-primary/50"
              />
              <circle
                cx={getCometPosition(progress, cardDimensions.width, cardDimensions.height).x}
                cy={getCometPosition(progress, cardDimensions.width, cardDimensions.height).y}
                r="5"
                className="fill-primary"
                filter="url(#cometGlow)"
              />
            </>
          </svg>
        )}

        <div className="relative w-full p-8 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 border-2 border-transparent shadow-lg shadow-primary/5 transition-all duration-500">
          <div className="flex items-start gap-6 mb-6">
            <div className="p-4 rounded-2xl bg-primary text-primary-foreground shrink-0 shadow-lg shadow-primary/30">
              {activeStat.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-5xl md:text-6xl font-bold text-primary">{activeStat.value}</span>
                <span className="text-xl md:text-2xl font-semibold text-foreground">{activeStat.label}</span>
              </div>
              <p className="text-muted-foreground text-lg">{activeStat.detail}</p>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">The Finding</h4>
            <p className="text-foreground/90 leading-relaxed">{activeStat.fullDescription}</p>
          </div>

          <details ref={detailsRef} className="group" onToggle={handleDetailsToggle}>
            <summary className="flex items-center gap-2 cursor-pointer text-sm text-primary/80 hover:text-primary transition-colors select-none">
              <span className="text-base">📊</span>
              <span className="font-medium">Dive into the research</span>
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
            </summary>

            <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Primary Study</h4>
                <p className="text-foreground text-sm font-medium">{activeStat.nerdBox.primaryStudy}</p>
              </div>

              {activeStat.nerdBox.keyQuote && (
                <div className="p-4 rounded-xl bg-muted/50 border-l-4 border-primary/40">
                  <p className="text-foreground/80 text-sm italic">&ldquo;{activeStat.nerdBox.keyQuote}&rdquo;</p>
                </div>
              )}

              <div className="p-4 rounded-xl bg-card border border-border">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Why It Works</h4>
                <ul className="space-y-1.5">
                  {activeStat.nerdBox.whyItWorks.map((reason, i) => (
                    <li key={i} className="text-foreground/70 text-sm flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Also Supported By</h4>
                <ul className="space-y-1.5">
                  {activeStat.nerdBox.alsoSupportedBy.map((support, i) => (
                    <li key={i} className="text-foreground/70 text-sm flex items-start gap-2">
                      <span className="text-accent mt-0.5">→</span>
                      <span>{support}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {activeStat.nerdBox.topPerformers && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10">
                  <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Top Performers Use This</h4>
                  <p className="text-foreground/80 text-sm">{activeStat.nerdBox.topPerformers}</p>
                </div>
              )}
            </div>
          </details>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {otherStats.map((stat) => {
          const originalIndex = stats.findIndex((s) => s.id === stat.id)
          const isComingUp = !isUserInteracting && originalIndex === nextIndex

          return (
            <button
              key={stat.id}
              onClick={() => handleStatClick(originalIndex)}
              className={`p-3 md:p-4 rounded-xl bg-card border transition-all duration-300 text-left group relative ${
                isComingUp
                  ? "border-primary/50 shadow-lg shadow-primary/20 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              {isComingUp && (
                <div className="absolute -top-2 left-3 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wide animate-pulse">
                  Up next
                </div>
              )}
              <div className="flex items-center gap-2 md:gap-3 mb-1.5">
                <div className={`p-1.5 md:p-2 rounded-lg transition-colors ${
                  isComingUp
                    ? "bg-primary/20 text-primary"
                    : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                }`}>
                  {stat.icon}
                </div>
                <span className="text-xl md:text-2xl font-bold text-primary">{stat.value}</span>
              </div>
              <p className="text-foreground font-medium text-xs md:text-sm">{stat.label}</p>
              <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1 md:line-clamp-2">{stat.detail}</p>
              {!isComingUp && (
                <div className="absolute bottom-1.5 right-1.5 md:bottom-2 md:right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Sparkles className="size-3 text-primary/60" />
                </div>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground/60">Click any stat to explore the research</p>
    </div>
  )
}

export default function KeyStatsTestPage() {
  const [activeVariation, setActiveVariation] = useState<VariationType>("original")

  const currentVariation = VARIATIONS.find((v) => v.id === activeVariation)!

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 md:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link href="/test">
              <ArrowLeft className="size-4 mr-2" />
              Back to Test Pages
            </Link>
          </Button>
          <h1 className="text-3xl font-bold mb-2">Key Stats Variations</h1>
          <p className="text-muted-foreground">
            Compare different versions of the key stats section to find the best presentation.
          </p>
        </div>

        {/* Variation Selector */}
        <div className="mb-8 p-1 bg-muted rounded-xl inline-flex gap-1">
          {VARIATIONS.map((variation) => (
            <button
              key={variation.id}
              onClick={() => setActiveVariation(variation.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeVariation === variation.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {variation.label}
            </button>
          ))}
        </div>

        {/* Current Variation Info */}
        <div className="mb-6 p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Currently Viewing
            </span>
          </div>
          <h2 className="text-lg font-semibold">{currentVariation.label}</h2>
          <p className="text-sm text-muted-foreground">{currentVariation.description}</p>
        </div>

        {/* Key Stats Section */}
        <KeyStatsSectionWithData stats={currentVariation.data} />

        {/* Comparison Notes */}
        <div className="mt-12 p-6 rounded-xl border border-border bg-card">
          <h3 className="text-lg font-semibold mb-4">Version Differences</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-primary">Original</h4>
              <p className="text-sm text-muted-foreground">
                Current production version with domain examples (sports, military, trading) in the &quot;Also Supported By&quot; sections.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-primary">Hybrid (Recommended)</h4>
              <p className="text-sm text-muted-foreground">
                Best of all worlds: Original structure and credibility + Enhanced supporting stats (habit stacking +64%, environmental cues +58%) +
                Creative&apos;s punchiest hooks (&quot;Your future self has no willpower&quot;, &quot;You NEED to forget before you remember&quot;,
                &quot;Stop analyzing the crash. Analyze the decision chain.&quot;). Same values and icons as original.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-primary">Enhanced</h4>
              <p className="text-sm text-muted-foreground">
                Adds more research-backed statistics to each fact&apos;s &quot;Also Supported By&quot; section. Stats are grouped by mechanism
                (e.g., implementation intentions now includes habit stacking +64% and environmental cues +58% since they share the same psychological mechanism).
              </p>
            </div>
            <div>
              <h4 className="font-medium text-primary">Creative</h4>
              <p className="text-sm text-muted-foreground">
                Same research reframed with provocative angles. Example: &quot;3x Success Rate&quot; becomes &quot;3x Autopilot Advantage&quot;
                with framing like &quot;Your future self has no willpower. Plan for that.&quot; Different icons and more punchy language.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
