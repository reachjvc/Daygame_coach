"use client"

import { BookOpen, X } from "lucide-react"

interface GuideVariantProps {
  expanded: boolean
  onToggle: () => void
}

export function GuideVariantA({ expanded, onToggle }: GuideVariantProps) {
  return (
    <>
      {/* Collapsed trigger — vertical tab on left edge */}
      {!expanded && (
        <button
          onClick={onToggle}
          className="fixed left-0 top-24 z-30 flex flex-col items-center gap-2 px-2 py-4 bg-card border border-l-0 border-border rounded-r-lg shadow-md cursor-pointer hover:border-primary/50 hover:shadow-lg hover:text-primary transition-all text-muted-foreground"
        >
          <BookOpen className="h-4 w-4" />
          <span className="text-xs font-medium" style={{ writingMode: "vertical-rl" }}>
            Guide
          </span>
        </button>
      )}

      {/* Panel — always in DOM, slides via transform */}
      <div
        className={`fixed left-0 top-24 bottom-8 w-[300px] bg-card border-r border-border shadow-xl transition-transform duration-300 ease-out flex flex-col z-30 ${expanded ? "translate-x-0" : "-translate-x-full"}`}
        style={{ borderTopRightRadius: 12, borderBottomRightRadius: 12 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Goals Guide</span>
          </div>
          <button onClick={onToggle} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-4 py-3">
          {/* Section 1 — How goals work */}
          <div className="border-b border-border/30 pb-4 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">How goals work</h3>
            <div className="text-xs leading-relaxed text-muted-foreground space-y-1.5">
              <p>
                Goals are organized in three levels: <strong className="text-foreground">Life Areas</strong> (Social, Inner Game, Health) contain <strong className="text-foreground">Categories</strong> which group related <strong className="text-foreground">Goals</strong>.
              </p>
              <p>
                <strong className="text-foreground">Daily actions</strong> are small repeatable steps you do each day. <strong className="text-foreground">Milestones</strong> are one-time achievements you work toward over time.
              </p>
            </div>
          </div>

          {/* Section 2 — Getting started */}
          <div className="border-b border-border/30 pb-4 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Getting started</h3>
            <div className="text-xs leading-relaxed text-muted-foreground space-y-1.5">
              <p>
                Run the <strong className="text-foreground">Setup Wizard</strong> to pick a direction and select goals from the catalog. You can always add more later from the Browse Catalog menu.
              </p>
              <p>
                Start with 2–3 daily goals. Adding too many at once makes it hard to build consistency.
              </p>
            </div>
          </div>

          {/* Section 3 — Using the views */}
          <div className="border-b border-border/30 pb-4 mb-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Using the views</h3>
            <div className="text-xs leading-relaxed text-muted-foreground space-y-1.5">
              <p>
                <strong className="text-foreground">Today</strong> — your daily checklist. Check off actions as you complete them.
              </p>
              <p>
                <strong className="text-foreground">Hierarchy</strong> — see all goals organized by life area and category.
              </p>
              <p>
                <strong className="text-foreground">Tree</strong> — visual tree showing how goals connect to life areas.
              </p>
              <p>
                <strong className="text-foreground">Orrery</strong> — animated orbital view of your goal system.
              </p>
            </div>
          </div>

          {/* Section 4 — Tips */}
          <div className="last:border-0">
            <h3 className="text-sm font-semibold text-foreground mb-2">Tips</h3>
            <div className="text-xs leading-relaxed text-muted-foreground space-y-1.5">
              <p>
                Use <strong className="text-foreground">Weekly Review</strong> to reflect on your progress and adjust targets. Find it in the &#x22ee; menu.
              </p>
              <p>
                Hide goals you&#39;re pausing with the <strong className="text-foreground">Customize</strong> toggle — they&#39;re not deleted, just tucked away.
              </p>
              <p>
                Build streaks by completing your daily goals consistently. Even partial completion counts toward building the habit.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
