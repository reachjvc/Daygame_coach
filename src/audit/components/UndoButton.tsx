"use client"

/**
 * THE UNDO BUTTON OF "DELETED · UNDO".
 *
 * It acts on the touch (pointerdown), not on the lift: the bar goes at the
 * instant the delete may be sent, and a finger that touched it just before
 * lifted on nothing, so no click came and the bar vanished with no word while
 * the answer was deleted (alpha p10-deletes-01, iPhone). The touch lands while
 * the bar is drawn, so it is always answered: undone, or "Too late to undo". A
 * click with no touch before it (the keyboard) still undoes.
 */

import { useRef } from "react"
import { Button } from "@/components/ui/button"

/** A click this soon after a touch on the button is that touch's own click. */
const CLICK_AFTER_TOUCH_MS = 1_500

export function UndoButton({ onUndo }: { onUndo: () => void }) {
  const touchedAt = useRef(0)
  return (
    <Button
      variant="outline"
      size="sm"
      onPointerDown={(e) => {
        // a touch, a pen or the main mouse button
        if (e.button > 0) return
        touchedAt.current = Date.now()
        onUndo()
      }}
      onClick={() => {
        if (Date.now() - touchedAt.current < CLICK_AFTER_TOUCH_MS) return
        onUndo()
      }}
    >
      Undo
    </Button>
  )
}
