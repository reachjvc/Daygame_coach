"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Quote } from "lucide-react"

type WisdomBoxProps = {
  quote: string
  attribution: string
  explanation?: string
  explanationTitle?: string
}

/**
 * Collapsible wisdom box with quote and optional explanation.
 * Used across inner game steps to provide psychological context.
 */
export function WisdomBox({
  quote,
  attribution,
  explanation,
  explanationTitle = "Why this matters",
}: WisdomBoxProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-muted/30 rounded-xl border border-border/50 overflow-hidden">
      {/* Quote section */}
      <div className="p-4">
        <div className="flex gap-3">
          <Quote className="w-5 h-5 text-primary/60 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-foreground/90 italic leading-relaxed">
              "{quote}"
            </p>
            <p className="text-sm text-muted-foreground">
              — {attribution}
            </p>
          </div>
        </div>
      </div>

      {/* Collapsible explanation */}
      {explanation && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-2 flex items-center justify-between gap-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-t border-border/30"
          >
            <span>{explanationTitle}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {isExpanded && (
            <div className="px-4 pb-4 pt-2 border-t border-border/30">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {explanation}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
