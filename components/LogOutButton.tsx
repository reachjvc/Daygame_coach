"use client"

/**
 * LOG OUT, WITHOUT SILENTLY LOSING WHAT HAS NOT BEEN SAVED.
 *
 * Log Out removes everything the time tracker kept in this browser
 * (`forgetOfflineCopies`), which is right for a browser the next person may
 * use — and was a silent loss for a change made in a basement with no signal:
 * a Stop that had not reached the account yet was simply gone. So when
 * something is still waiting, Log Out first tries to send it, the way the
 * tracker would, for a few seconds at most. What still could not go is named,
 * and only "Log out anyway" throws it away. "Stay signed in" keeps everything.
 *
 * The header and the phone's More sheet each draw their own button; this owns
 * what pressing it does.
 */

import { useCallback, useRef, useState, useTransition, type ReactNode } from "react"

import { signOut } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { forgetOfflineCopies } from "@/src/shared/offlineCopies"
import { SendTrackerChanges } from "@/src/timetrack/components/SendTrackerChanges"
import { sendTrackerChangesNow, unsentTrackerChanges } from "@/src/timetrack/hooks/useTimetrackSync"

/** How long Log Out waits for waiting changes to go before it asks */
export const SEND_BEFORE_LOG_OUT_MS = 5_000
const LOOK_EVERY_MS = 250

type Phase = { kind: "idle" } | { kind: "sending" } | { kind: "asking"; left: number } | { kind: "leaving" }

export function LogOutButton({ children }: { children: (press: { onClick: () => void; busy: boolean }) => ReactNode }) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  /** No tracker is mounted in this tab, so a sender of its own is */
  const [ownSender, setOwnSender] = useState(false)
  const stranger = useRef(false)
  const [, startTransition] = useTransition()

  const leave = useCallback(() => {
    setOwnSender(false)
    setPhase({ kind: "leaving" })
    startTransition(async () => {
      await forgetOfflineCopies()
      await signOut()
    })
  }, [])

  const onStranger = useCallback(() => {
    // the copy here is another account's: nothing of the person logging out is waiting
    stranger.current = true
  }, [])

  const onClick = useCallback(() => {
    if (phase.kind !== "idle") return
    if (unsentTrackerChanges() === 0) {
      leave()
      return
    }
    setPhase({ kind: "sending" })
    stranger.current = false
    if (!sendTrackerChangesNow()) setOwnSender(true)
    const started = Date.now()
    const look = () => {
      const left = unsentTrackerChanges()
      if (left === 0 || stranger.current) {
        setOwnSender(false)
        leave()
        return
      }
      if (Date.now() - started >= SEND_BEFORE_LOG_OUT_MS) {
        setPhase({ kind: "asking", left })
        return
      }
      setTimeout(look, LOOK_EVERY_MS)
    }
    setTimeout(look, LOOK_EVERY_MS)
  }, [phase.kind, leave])

  const stay = useCallback(() => {
    setOwnSender(false)
    setPhase({ kind: "idle" })
  }, [])

  const left = phase.kind === "asking" ? phase.left : 0
  return (
    <>
      {children({ onClick, busy: phase.kind === "sending" || phase.kind === "leaving" })}
      {ownSender && <SendTrackerChanges onStranger={onStranger} />}
      <Dialog open={phase.kind === "asking"} onOpenChange={(open) => !open && stay()}>
        <DialogContent className="sm:max-w-md" data-testid="log-out-unsent">
          <DialogTitle>Not saved to your account yet</DialogTitle>
          <DialogDescription>
            {left === 1 ? "1 change hasn't" : `${left} changes haven't`} reached your account yet, probably because there is
            no signal. Log out anyway and lose {left === 1 ? "it" : "them"}?
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={stay} data-testid="log-out-stay">
              Stay signed in
            </Button>
            <Button variant="destructive" onClick={leave} data-testid="log-out-anyway">
              Log out anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
