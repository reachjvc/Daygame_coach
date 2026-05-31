"use client"

import { useState } from "react"
import { BookOpen, X } from "lucide-react"

interface GuideVariantProps {
  expanded: boolean
  onToggle: () => void
}

const TAB_LABELS = ["Goals", "Start", "Views", "Tips"]

export function GuideVariantB({ expanded, onToggle }: GuideVariantProps) {
  const [activeTab, setActiveTab] = useState(0)

  if (!expanded) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-3 top-28 z-30 w-11 h-11 flex items-center justify-center rounded-full bg-card border border-border shadow-md cursor-pointer text-muted-foreground hover:border-primary/50 hover:shadow-lg hover:text-primary transition-all"
      >
        <BookOpen className="h-5 w-5" />
      </button>
    )
  }

  return (
    <>
      <style>{`@keyframes guidePopIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`}</style>
      {expanded && (
        <div
          className="fixed left-3 top-24 w-[300px] max-h-[calc(100vh-8rem)] bg-card border border-border rounded-lg shadow-2xl flex flex-col z-30"
          style={{ animation: "guidePopIn 200ms ease-out forwards" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Goals Guide</span>
            </div>
            <button
              onClick={onToggle}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-border px-2">
            {TAB_LABELS.map((label, i) => (
              <button
                key={label}
                onClick={() => setActiveTab(i)}
                className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                  activeTab === i
                    ? "border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground border-transparent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Active tab content */}
          <div className="overflow-y-auto flex-1 p-4 text-xs leading-relaxed text-muted-foreground space-y-2">
            {activeTab === 0 && (
              <>
                <p>
                  Goals are organized in three levels: <strong className="text-foreground">Life Areas</strong> (Social, Inner Game, Health) contain <strong className="text-foreground">Categories</strong> which group related <strong className="text-foreground">Goals</strong>.
                </p>
                <p>
                  <strong className="text-foreground">Daily actions</strong> are small repeatable steps you do each day. <strong className="text-foreground">Milestones</strong> are one-time achievements you work toward over time.
                </p>
              </>
            )}
            {activeTab === 1 && (
              <>
                <p>
                  Run the <strong className="text-foreground">Setup Wizard</strong> to pick a direction and select goals from the catalog. You can always add more later from the Browse Catalog menu.
                </p>
                <p>
                  Start with 2–3 daily goals. Adding too many at once makes it hard to build consistency.
                </p>
              </>
            )}
            {activeTab === 2 && (
              <>
                <p><strong className="text-foreground">Today</strong> — your daily checklist.</p>
                <p><strong className="text-foreground">Hierarchy</strong> — goals by life area and category.</p>
                <p><strong className="text-foreground">Tree</strong> — visual tree of goal connections.</p>
                <p><strong className="text-foreground">Orrery</strong> — animated orbital view.</p>
              </>
            )}
            {activeTab === 3 && (
              <>
                <p>
                  Use <strong className="text-foreground">Weekly Review</strong> to reflect on progress. Find it in the ⋮ menu.
                </p>
                <p>
                  Hide goals you{"'"}re pausing with <strong className="text-foreground">Customize</strong> — they{"'"}re not deleted, just tucked away.
                </p>
                <p>
                  Build streaks by completing daily goals consistently.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
