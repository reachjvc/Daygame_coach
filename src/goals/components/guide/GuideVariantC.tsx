"use client"

import { useState } from "react"
import { BookOpen, X, ChevronLeft, ChevronRight } from "lucide-react"

interface GuideVariantProps {
  expanded: boolean
  onToggle: () => void
}

const pages = [
  {
    title: "How goals work",
    content: [
      <>Goals are organized in three levels: <strong className="text-foreground">Life Areas</strong> (Social, Inner Game, Health) contain <strong className="text-foreground">Categories</strong> which group related <strong className="text-foreground">Goals</strong>.</>,
      <><strong className="text-foreground">Daily actions</strong> are small repeatable steps you do each day. <strong className="text-foreground">Milestones</strong> are one-time achievements you work toward over time.</>,
    ],
  },
  {
    title: "Getting started",
    content: [
      <>Run the <strong className="text-foreground">Setup Wizard</strong> to pick a direction and select goals from the catalog. You can always add more later from the Browse Catalog menu.</>,
      <>Start with 2–3 daily goals. Adding too many at once makes it hard to build consistency.</>,
    ],
  },
  {
    title: "Using the views",
    content: [
      <><strong className="text-foreground">Today</strong> — your daily checklist. Check off actions as you complete them.</>,
      <><strong className="text-foreground">Hierarchy</strong> — see all goals organized by life area and category.</>,
      <><strong className="text-foreground">Tree</strong> — visual tree showing how goals connect to life areas.</>,
      <><strong className="text-foreground">Orrery</strong> — animated orbital view of your goal system.</>,
    ],
  },
  {
    title: "Tips",
    content: [
      <>Use <strong className="text-foreground">Weekly Review</strong> to reflect on your progress and adjust targets. Find it in the ⋮ menu.</>,
      <>Hide goals you&apos;re pausing with the <strong className="text-foreground">Customize</strong> toggle — they&apos;re not deleted, just tucked away.</>,
      <>Build streaks by completing your daily goals consistently. Even partial completion counts toward building the habit.</>,
    ],
  },
]

export function GuideVariantC({ expanded, onToggle }: GuideVariantProps) {
  const [currentPage, setCurrentPage] = useState(0)

  return (
    <>
      {/* Collapsed trigger — thin accent stripe with hover icon */}
      {!expanded && (
        <button
          onClick={onToggle}
          className="fixed left-0 top-24 bottom-8 group flex items-center cursor-pointer z-30"
        >
          <div className="w-1 h-full bg-primary/40 group-hover:bg-primary/70 transition-all duration-200" />
          <div className="absolute left-0 w-10 h-10 flex items-center justify-center bg-card border border-border rounded-r-lg shadow-md opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 top-1/2 -translate-y-1/2">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
        </button>
      )}

      {/* Panel — always in DOM, slides via transform */}
      <div
        className={`fixed left-0 top-24 bottom-8 w-[300px] bg-card border-r border-border shadow-xl flex flex-col transition-transform duration-300 ease-out z-30 ${expanded ? "translate-x-0" : "-translate-x-full"}`}
        style={{ borderTopRightRadius: 12, borderBottomRightRadius: 12 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Goals Guide</span>
          </div>
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Page content */}
        <div className="flex-1 flex flex-col justify-center px-6 py-6">
          <h3 className="text-base font-semibold text-foreground mb-3">
            {pages[currentPage].title}
          </h3>
          <div className="text-sm leading-relaxed text-muted-foreground space-y-3">
            {pages[currentPage].content.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>

        {/* Nav footer */}
        <div className="shrink-0 px-4 py-3 border-t border-border/50 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage((p) => p - 1)}
            disabled={currentPage === 0}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft className="h-3 w-3" />
            Prev
          </button>

          <div className="flex items-center gap-1.5">
            {pages.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${i === currentPage ? "bg-primary" : "bg-muted-foreground/30"}`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={currentPage === pages.length - 1}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </>
  )
}
