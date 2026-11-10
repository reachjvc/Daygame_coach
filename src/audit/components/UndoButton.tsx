"use client"

/**
 * THE UNDO BUTTON OF "DELETED · UNDO".
 *
 * The touch is recorded on pointerdown and answered on the lift, wherever the
 * finger lifts: the bar goes at the instant the delete may be sent, and a
 * finger that touched it just before lifted on nothing, so no click came and
 * the bar vanished with no word while the answer was deleted (alpha
 * p10-deletes-01, iPhone). The lift is watched on the window, so it is heard
 * even when the bar went in between: undone, or "Too late to undo".
 *
 * A scroll that starts on the bar is not a tap (code review): a press that
 * moves MOVE_LIMIT_PX or more, or that the browser takes over for scrolling
 * (pointercancel), does not undo. A click with no press before it (the
 * keyboard) still undoes.
 */

import { useRef } from "react"
import { Button } from "@/components/ui/button"

/** A click this soon after a press on the button is that press's own click. */
const CLICK_AFTER_TOUCH_MS = 1_500
/** A press that moves this far is a scroll or a drag, not a tap. */
const MOVE_LIMIT_PX = 10

export function UndoButton({ onUndo }: { onUndo: () => void }) {
  const touchedAt = useRef(0)
  const latest = useRef(onUndo)
  latest.current = onUndo
  const stopWatching = useRef<(() => void) | null>(null)
  return (
    <Button
      variant="outline"
      size="sm"
      onPointerDown={(e) => {
        // a touch, a pen or the main mouse button
        if (e.button > 0) return
        touchedAt.current = Date.now()
        stopWatching.current?.()
        const { pointerId, clientX: x, clientY: y } = e
        const moved = (ev: PointerEvent) => Math.hypot(ev.clientX - x, ev.clientY - y) >= MOVE_LIMIT_PX
        let isTap = true
        const onMove = (ev: PointerEvent) => {
          if (ev.pointerId === pointerId && moved(ev)) isTap = false
        }
        const onUp = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return
          stop()
          if (isTap && !moved(ev)) latest.current()
        }
        const onCancel = (ev: PointerEvent) => {
          if (ev.pointerId === pointerId) stop()
        }
        // kept past an unmount: the bar may go before the finger lifts
        const stop = () => {
          window.removeEventListener("pointermove", onMove, true)
          window.removeEventListener("pointerup", onUp, true)
          window.removeEventListener("pointercancel", onCancel, true)
          stopWatching.current = null
        }
        window.addEventListener("pointermove", onMove, true)
        window.addEventListener("pointerup", onUp, true)
        window.addEventListener("pointercancel", onCancel, true)
        stopWatching.current = stop
      }}
      onClick={() => {
        if (Date.now() - touchedAt.current < CLICK_AFTER_TOUCH_MS) return
        latest.current()
      }}
    >
      Undo
    </Button>
  )
}
