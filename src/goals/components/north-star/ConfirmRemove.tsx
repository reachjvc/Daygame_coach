"use client"

/**
 * ONE "ARE YOU SURE" FOR REMOVING SOMETHING FROM THE PLAN.
 *
 * There were six ways to delete a plan goal and four of them asked. The four
 * carried three separate copies of this two-click dance; the other two —
 * `GuidedBuild`'s row and the "this duplicates a routine step" tidy-up link in
 * `AreaBuilder` — deleted on a single click, in the two places somebody is
 * moving fastest and least likely to mean it.
 *
 * Two clicks rather than a modal, deliberately. A dialog for every small row
 * teaches people to dismiss dialogs, and the thing being removed is right there
 * under the cursor: "delete / keep" beside it says what will happen without
 * taking the screen away.
 *
 * It asks whether to remove the row. What removing a PUSHED goal does to its
 * counted twin on the goals page is a second question, asked once, by the flow
 * itself — see `removePlanGoal` in `NorthStarFlow`.
 */

import { useState } from "react"
import { X } from "lucide-react"

export function ConfirmRemove({
  title,
  onRemove,
  variant = "icon",
  label,
  className = "",
}: {
  /** What is being removed, for the screen-reader label. */
  title: string
  onRemove: () => void
  /** `icon` is a small ✕ beside a row; `link` is a phrase inside a sentence. */
  variant?: "icon" | "link"
  /** The words for the `link` variant, ignored by `icon`. */
  label?: string
  className?: string
}) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <span className={`shrink-0 inline-flex items-center gap-1.5 text-[11px] ${className}`}>
        <button
          onClick={() => { setConfirming(false); onRemove() }}
          className="text-rose-300 hover:text-rose-200 transition-colors"
        >
          delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          keep
        </button>
      </span>
    )
  }

  if (variant === "link") {
    return (
      <button
        onClick={() => setConfirming(true)}
        className={`text-amber-100 underline decoration-dotted underline-offset-2 hover:text-white transition-colors ${className}`}
      >
        {label}
      </button>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      aria-label={`Remove ${title}`}
      title={`Remove ${title}`}
      className={`shrink-0 text-zinc-500 hover:text-rose-300 transition-colors ${className}`}
    >
      <X className="size-3.5" />
    </button>
  )
}
