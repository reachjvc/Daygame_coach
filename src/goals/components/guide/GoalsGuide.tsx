"use client"

import { useState, useEffect } from "react"
import { BookOpen, X } from "lucide-react"

const EXPANDED_KEY = "goals-guidance-expanded"

export function GoalsGuide() {
  const [expanded, setExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(EXPANDED_KEY)
    if (stored === "true") setExpanded(true)
  }, [])

  function toggle() {
    setExpanded((prev) => {
      const next = !prev
      localStorage.setItem(EXPANDED_KEY, String(next))
      return next
    })
  }

  if (!mounted) return null

  return (
    <div className="fixed left-0 top-16 bottom-0 z-30 hidden min-[1440px]:block">
      {/* The bar — always visible, full height */}
      <button
        onClick={toggle}
        className={`
          absolute left-0 top-0 bottom-0 w-14 flex flex-col items-center justify-center gap-3
          bg-card/80 backdrop-blur border-r border-border
          cursor-pointer transition-all duration-300
          hover:bg-card hover:w-16
          ${expanded ? "bg-card" : ""}
        `}
      >
        <BookOpen className={`h-5 w-5 shrink-0 transition-colors ${expanded ? "text-primary" : "text-muted-foreground"}`} />
        <div className={`flex flex-col items-center gap-1 text-[11px] font-bold tracking-wide transition-colors ${expanded ? "text-primary" : "text-muted-foreground"}`}>
          {"GUIDE".split("").map((c, i) => <span key={i}>{c}</span>)}
        </div>
        {!expanded && (
          <div className="absolute top-4 right-2 w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
        )}
      </button>

      {/* Horizontal card — drops down from the bar, extends to the right */}
      <div
        className={`
          absolute left-14 top-8 bg-card border border-border rounded-r-lg rounded-b-lg shadow-2xl
          transition-all duration-300 ease-out overflow-hidden
          ${expanded ? "opacity-100 w-[820px]" : "opacity-0 w-0"}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Goals Guide</span>
          </div>
          <button
            onClick={toggle}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* 2x2 grid content — horizontal layout */}
        <div className="grid grid-cols-2 gap-5 p-5 min-w-[820px]">
          {/* Cell 1 */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">How goals work</h3>
            <div className="text-xs leading-relaxed text-muted-foreground space-y-1.5">
              <p>
                Goals are organized in three levels: <strong className="text-foreground">Life Areas</strong> (Social,
                Inner Game, Health) contain <strong className="text-foreground">Categories</strong> which group
                related <strong className="text-foreground">Goals</strong>.
              </p>
              <p>
                <strong className="text-foreground">Daily actions</strong> are small repeatable steps you do each day.{" "}
                <strong className="text-foreground">Milestones</strong> are one-time achievements you work toward over
                time.
              </p>
            </div>
          </div>

          {/* Cell 2 */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">Getting started</h3>
            <div className="text-xs leading-relaxed text-muted-foreground space-y-1.5">
              <p>
                Run the <strong className="text-foreground">Setup Wizard</strong> to pick a direction and select goals
                from the catalog. You can always add more later from the Browse Catalog menu.
              </p>
              <p>
                Start with 2–3 daily goals. Adding too many at once makes it hard to build consistency.
              </p>
            </div>
          </div>

          {/* Cell 3 */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">Using the views</h3>
            <div className="text-xs leading-relaxed text-muted-foreground space-y-1.5">
              <p>
                <strong className="text-foreground">Today</strong> — your daily checklist. Check off actions as you
                complete them.
              </p>
              <p>
                <strong className="text-foreground">Hierarchy</strong> — see all goals organized by life area and
                category.
              </p>
              <p>
                <strong className="text-foreground">Tree</strong> — visual tree showing how goals connect to life
                areas.
              </p>
              <p>
                <strong className="text-foreground">Orrery</strong> — animated orbital view of your goal system.
              </p>
            </div>
          </div>

          {/* Cell 4 */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1.5">Tips</h3>
            <div className="text-xs leading-relaxed text-muted-foreground space-y-1.5">
              <p>
                Use <strong className="text-foreground">Weekly Review</strong> to reflect on your progress and adjust
                targets. Find it in the ⋮ menu.
              </p>
              <p>
                Hide goals you{"'"}re pausing with the <strong className="text-foreground">Customize</strong> toggle —
                they{"'"}re not deleted, just tucked away.
              </p>
              <p>
                Build streaks by completing your daily goals consistently. Even partial completion counts toward
                building the habit.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
