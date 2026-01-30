"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, Sparkles } from "lucide-react"
import { KEY_STATS_DATA } from "../data/keyStats"

const TIMER_DURATION = 40 // seconds

/**
 * Calculate the x,y position of a dot along the rectangular border
 * Progress goes: bottom-left → top-left → top-right → bottom-right → bottom-left
 * @param progress - Current animation progress (0-1)
 * @param dimensions - Card width, height, perimeter
 * @param offset - Starting offset (0 = bottom-left, 0.5 = top-right)
 */
function getDotPosition(
  progress: number,
  dimensions: { width: number; height: number; perimeter: number },
  offset: number
): { x: number; y: number } {
  const { width, height } = dimensions
  const padding = 2
  const w = width - padding * 2
  const h = height - padding * 2
  const totalLength = 2 * w + 2 * h

  // Adjust progress with offset and wrap
  const p = ((progress + offset) % 1) * totalLength

  // Trace path: bottom-left → left edge up → top edge right → right edge down → bottom edge left
  if (p < h) {
    // Left edge (going up from bottom-left)
    return { x: padding, y: height - padding - p }
  } else if (p < h + w) {
    // Top edge (going right)
    return { x: padding + (p - h), y: padding }
  } else if (p < 2 * h + w) {
    // Right edge (going down)
    return { x: width - padding, y: padding + (p - h - w) }
  } else {
    // Bottom edge (going left)
    return { x: width - padding - (p - 2 * h - w), y: height - padding }
  }
}

/**
 * Displays research-backed key statistics about field report effectiveness
 * Features:
 * - Main highlighted stat with full research details
 * - Mini stat cards that swap when clicked
 * - Expandable "nerd box" with detailed citations
 * - Animated border timer (40s) that stops on interaction
 */
export function KeyStatsSection() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [cardDimensions, setCardDimensions] = useState({ width: 0, height: 0, perimeter: 0 })
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const pausedProgressRef = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)

  // Measure card dimensions for SVG border
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

  // Handle the border animation
  useEffect(() => {
    if (isPaused) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp - (pausedProgressRef.current * TIMER_DURATION * 1000)
      }

      const elapsed = timestamp - startTimeRef.current
      const newProgress = Math.min(elapsed / (TIMER_DURATION * 1000), 1)
      setProgress(newProgress)

      if (newProgress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Advance to next stat and reset timer
        setActiveIndex((prev) => (prev + 1) % KEY_STATS_DATA.length)
        startTimeRef.current = null
        pausedProgressRef.current = 0
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
  }, [isPaused])

  // When user clicks a mini card, pause the timer
  const handleStatClick = (index: number) => {
    setIsPaused(true)
    pausedProgressRef.current = progress
    setActiveIndex(index)
  }

  // Resume timer when clicking the main card area (optional)
  const handleMainCardClick = () => {
    if (isPaused) {
      startTimeRef.current = null
      setIsPaused(false)
    }
  }

  const activeStat = KEY_STATS_DATA[activeIndex]
  const otherStats = KEY_STATS_DATA.filter((_, i) => i !== activeIndex)

  // Calculate which stat is coming up next
  const nextIndex = (activeIndex + 1) % KEY_STATS_DATA.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <p className="text-sm text-primary font-semibold uppercase tracking-wider mb-1">Research-Backed</p>
        <h2 className="text-2xl font-bold text-foreground">Why This Works</h2>
      </div>

      {/* Main highlighted stat card with animated border */}
      <div
        ref={cardRef}
        className="relative w-full rounded-2xl cursor-pointer"
        onClick={handleMainCardClick}
      >
        {/* SVG animated border with two chasing dots */}
        {cardDimensions.perimeter > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            viewBox={`0 0 ${cardDimensions.width} ${cardDimensions.height}`}
            preserveAspectRatio="none"
          >
            <defs>
              {/* Glow filter for dots */}
              <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Gradient for dot trail effect */}
              <radialGradient id="dotGradient">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6366f1" />
              </radialGradient>
            </defs>
            {/* Background border (faint) */}
            <rect
              x="2"
              y="2"
              width={cardDimensions.width - 4}
              height={cardDimensions.height - 4}
              rx="14"
              ry="14"
              fill="none"
              className="stroke-primary/15"
              strokeWidth="2"
            />
            {/* Dot 1 - starts bottom-left, moves clockwise */}
            {!isPaused && (
              <circle
                cx={getDotPosition(progress, cardDimensions, 0).x}
                cy={getDotPosition(progress, cardDimensions, 0).y}
                r="5"
                fill="url(#dotGradient)"
                filter="url(#dotGlow)"
                className="animate-pulse"
              />
            )}
            {/* Dot 2 - starts top-right (opposite), moves clockwise */}
            {!isPaused && (
              <circle
                cx={getDotPosition(progress, cardDimensions, 0.5).x}
                cy={getDotPosition(progress, cardDimensions, 0.5).y}
                r="5"
                fill="url(#dotGradient)"
                filter="url(#dotGlow)"
                className="animate-pulse"
              />
            )}
          </svg>
        )}

        {/* Card content */}
        <div className="relative w-full p-8 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 border-2 border-transparent shadow-lg shadow-primary/5 transition-all duration-500">
        {/* Top row: Icon + Big stat */}
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

        {/* The Finding */}
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">The Finding</h4>
          <p className="text-foreground/90 leading-relaxed">{activeStat.fullDescription}</p>
        </div>

        {/* Nerd Box - Expandable Research Details */}
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-sm text-primary/80 hover:text-primary transition-colors select-none">
            <span className="text-base">📊</span>
            <span className="font-medium">Dive into the research</span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>

          <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Primary Study */}
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Primary Study</h4>
              <p className="text-foreground text-sm font-medium">{activeStat.nerdBox.primaryStudy}</p>
            </div>

            {/* Key Quote */}
            {activeStat.nerdBox.keyQuote && (
              <div className="p-4 rounded-xl bg-muted/50 border-l-4 border-primary/40">
                <p className="text-foreground/80 text-sm italic">&ldquo;{activeStat.nerdBox.keyQuote}&rdquo;</p>
              </div>
            )}

            {/* Why It Works */}
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

            {/* Also Supported By */}
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

            {/* Top Performers */}
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

      {/* Other stats as mini cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {otherStats.map((stat) => {
          const originalIndex = KEY_STATS_DATA.findIndex((s) => s.id === stat.id)
          const isComingUp = !isPaused && originalIndex === nextIndex

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
              {/* Coming up badge */}
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
              {/* Expand indicator */}
              {!isComingUp && (
                <div className="absolute bottom-1.5 right-1.5 md:bottom-2 md:right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Sparkles className="size-3 text-primary/60" />
                </div>
              )}
            </button>
          )
        })}
      </div>
      {/* Hint text */}
      <p className="text-center text-xs text-muted-foreground/60">Click any stat to explore the research</p>
    </div>
  )
}
