"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, Sparkles } from "lucide-react"
import { KEY_STATS_HYBRID } from "../data/keyStatsHybrid"

const TIMER_DURATION = 20 // seconds

/**
 * Calculate the x,y position of a dot along the rectangular border
 * Progress goes: bottom-center → left → top → right → back to bottom-center
 * @param progress - Current animation progress (0-1)
 * @param width - Card width
 * @param height - Card height
 */
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

  // Start from bottom-center
  const p = (progress % 1) * totalLength

  // Path: bottom-center → left on bottom → up left edge → across top → down right → back to center
  // Segment lengths: halfW (to left corner) + h (up) + w (across top) + h (down) + halfW (back to center)

  if (p < halfW) {
    // Bottom edge: center to left corner
    return { x: width / 2 - p, y: height - padding }
  } else if (p < halfW + h) {
    // Left edge: going up
    return { x: padding, y: height - padding - (p - halfW) }
  } else if (p < halfW + h + w) {
    // Top edge: going right
    return { x: padding + (p - halfW - h), y: padding }
  } else if (p < halfW + h + w + h) {
    // Right edge: going down
    return { x: width - padding, y: padding + (p - halfW - h - w) }
  } else {
    // Bottom edge: right corner back to center
    return { x: width - padding - (p - halfW - h - w - h), y: height - padding }
  }
}

/**
 * Displays research-backed key statistics about field report effectiveness
 * Features:
 * - Main highlighted stat with full research details
 * - Mini stat cards that swap when clicked
 * - Expandable "nerd box" with detailed citations (outside the animated border)
 * - Animated border comet (20s loop) - dots always animate around fixed-height header
 * - Click main card or any card: toggles expanded/collapsed research details
 * - Auto-rotation pauses when expanded, resumes when collapsed
 */
export function KeyStatsSection() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isUserInteracting, setIsUserInteracting] = useState(false) // User clicked a card or expanded details
  const [isDetailsOpen, setIsDetailsOpen] = useState(false) // Controls details panel visibility
  const [progress, setProgress] = useState(0)
  const [cardDimensions, setCardDimensions] = useState({ width: 0, height: 0, perimeter: 0 })
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
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

  // Handle the border animation - dots always move, but only auto-switch when not interacting
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
        // Only advance to next stat if user is not interacting
        if (!isUserInteracting) {
          setActiveIndex((prev) => (prev + 1) % KEY_STATS_HYBRID.length)
        }
        // Reset timer regardless (dots keep looping)
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
  }, [isUserInteracting])

  // Toggle details open/closed
  const toggleDetails = () => {
    const newOpen = !isDetailsOpen
    setIsDetailsOpen(newOpen)
    setIsUserInteracting(newOpen)
  }

  // When user clicks a mini card
  const handleStatClick = (index: number) => {
    if (index === activeIndex) {
      // Clicking already-selected card: toggle expanded state
      toggleDetails()
    } else {
      // Clicking a different card: switch to it and expand
      setActiveIndex(index)
      setIsDetailsOpen(true)
      setIsUserInteracting(true)
    }
  }

  // Clicking the main card area toggles the details
  const handleMainCardClick = () => {
    toggleDetails()
  }

  const activeStat = KEY_STATS_HYBRID[activeIndex]
  // Reorder so items after activeIndex come first, then items before it
  // This creates a circular queue: when fact 1 rotates out, it goes to the back
  const otherStats = [
    ...KEY_STATS_HYBRID.slice(activeIndex + 1),
    ...KEY_STATS_HYBRID.slice(0, activeIndex),
  ]

  // Calculate which stat is coming up next
  const nextIndex = (activeIndex + 1) % KEY_STATS_HYBRID.length

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
        className={`relative w-full rounded-2xl cursor-pointer transition-transform duration-300 ${
          isDetailsOpen ? 'scale-[1.01]' : ''
        }`}
        onClick={handleMainCardClick}
      >
        {/* SVG animated border - shows comet when collapsed, corner accent when expanded */}
        {cardDimensions.perimeter > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            viewBox={`0 0 ${cardDimensions.width} ${cardDimensions.height}`}
            preserveAspectRatio="none"
          >
            <defs>
              {/* Glow filter for dots */}
              <filter id="cometGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Stronger glow for anchor dot */}
              <filter id="anchorGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
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
              className={`transition-all duration-300 ${isDetailsOpen ? 'stroke-primary/20' : 'stroke-primary/10'}`}
              strokeWidth="1.5"
            />

            {/* COLLAPSED STATE: Comet animation */}
            {!isDetailsOpen && (
              <g className="transition-opacity duration-200">
                {/* Anchor dot at bottom-center */}
                <circle
                  cx={cardDimensions.width / 2}
                  cy={cardDimensions.height - 2}
                  r="4"
                  className="fill-primary/60"
                  filter="url(#anchorGlow)"
                />
                {/* Trail dots (fading) */}
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
                {/* Main comet head */}
                <circle
                  cx={getCometPosition(progress, cardDimensions.width, cardDimensions.height).x}
                  cy={getCometPosition(progress, cardDimensions.width, cardDimensions.height).y}
                  r="5"
                  className="fill-primary"
                  filter="url(#cometGlow)"
                />
              </g>
            )}

            {/* EXPANDED STATE: Gradient border morph - refined and crisp */}
            {isDetailsOpen && (
              <g className="animate-in fade-in duration-500">
                <defs>
                  {/* Morphing gradient: teal → purple → rose → teal (10s cycle) */}
                  <linearGradient id="morphGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%">
                      <animate
                        attributeName="stop-color"
                        values="#14B8A6;#8B5CF6;#F43F5E;#14B8A6"
                        dur="10s"
                        repeatCount="indefinite"
                      />
                    </stop>
                    <stop offset="50%">
                      <animate
                        attributeName="stop-color"
                        values="#8B5CF6;#F43F5E;#14B8A6;#8B5CF6"
                        dur="10s"
                        repeatCount="indefinite"
                      />
                    </stop>
                    <stop offset="100%">
                      <animate
                        attributeName="stop-color"
                        values="#F43F5E;#14B8A6;#8B5CF6;#F43F5E"
                        dur="10s"
                        repeatCount="indefinite"
                      />
                    </stop>
                  </linearGradient>
                  {/* Subtle glow filter */}
                  <filter id="borderGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Subtle outer glow */}
                <rect
                  x="1"
                  y="1"
                  width={cardDimensions.width - 2}
                  height={cardDimensions.height - 2}
                  rx="15"
                  ry="15"
                  fill="none"
                  stroke="url(#morphGradient)"
                  strokeWidth="3"
                  strokeOpacity="0.15"
                  filter="url(#borderGlow)"
                />
                {/* Main border - thin and crisp */}
                <rect
                  x="2"
                  y="2"
                  width={cardDimensions.width - 4}
                  height={cardDimensions.height - 4}
                  rx="14"
                  ry="14"
                  fill="none"
                  stroke="url(#morphGradient)"
                  strokeWidth="1.5"
                  strokeOpacity="0.85"
                />
              </g>
            )}
          </svg>
        )}

        {/* Card content */}
        <div className={`relative w-full p-6 rounded-xl bg-gradient-to-br from-primary/10 to-accent/5 border border-transparent transition-all duration-300 ${
          isDetailsOpen
            ? 'shadow-lg shadow-primary/20'
            : 'shadow-md shadow-primary/5'
        }`}>
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

          {/* Research trigger button */}
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-primary/80 hover:text-primary transition-colors select-none"
            onClick={(e) => {
              e.stopPropagation()
              toggleDetails()
            }}
          >
            <span className="text-base">📊</span>
            <span className="font-medium">Dive into the research</span>
            <ChevronDown className={`size-4 transition-transform duration-200 ${isDetailsOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Expandable research details - INSIDE the card */}
          {isDetailsOpen && (
            <div className="mt-6 pt-6 border-t border-primary/20 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-4">
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
            </div>
          )}
        </div>
      </div>

      {/* Other stats as mini cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {otherStats.map((stat) => {
          const originalIndex = KEY_STATS_HYBRID.findIndex((s) => s.id === stat.id)
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
