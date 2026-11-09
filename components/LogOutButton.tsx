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
 * The audit's answers waiting for signal are counted and sent the same way
 * (`sendWaitingAudit`): they were wiped with no word (alpha test fast-audit-01).
 *
 * The header and the phone's More sheet each draw their own button; this owns
 * what pressing it does.
 */

import { useCallback, useRef, useState, useTransition, type ReactNode } from "react"

import { signOut } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { unsentAuditChanges } from "@/src/audit/auditQueue"
import { sendWaitingAudit, type AuditSendOutcome } from "@/src/audit/sendWaitingAudit"
import { forgetOfflineCopies } from "@/src/shared/offlineCopies"
import { SendTrackerChanges } from "@/src/timetrack/components/SendTrackerChanges"
import { sendTrackerChangesNow, unsentTrackerChanges } from "@/src/timetrack/hooks/useTimetrackSync"

/** How long Log Out waits for waiting changes to go before it asks */
export const SEND_BEFORE_LOG_OUT_MS = 5_000
const LOOK_EVERY_MS = 250

type Phase =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "asking"; left: number; refused: AuditSendOutcome["refused"] }
  | { kind: "leaving" }

const clock = (iso: string) => {
  try {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function LogOutButton({ children }: { children: (press: { onClick: () => void; busy: boolean }) => ReactNode }) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  /** No tracker is mounted in this tab, so a sender of its own is */
  const [ownSender, setOwnSender] = useState(false)
  const stranger = useRef(false)
  /** The audit queue here is another account's (409): not the person's who is logging out */
  const auditStranger = useRef(false)
  const auditSending = useRef(false)
  /** Audit answers the account refused for good, with its reason: named, and dropped only by "Log out anyway" */
  const auditRefused = useRef<AuditSendOutcome["refused"]>([])
  const auditFinal = useRef(false)
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

  /** One audit send at a time; tried again while Log Out waits, as signal may return */
  const sendAudit = useCallback(() => {
    // Everything left was refused for good: sending it again changes nothing.
    if (auditSending.current || auditStranger.current || auditFinal.current || unsentAuditChanges() === 0) return
    auditSending.current = true
    void sendWaitingAudit()
      .then((result) => {
        if (result.status === "stranger") auditStranger.current = true
        auditRefused.current = result.refused
        if (result.status === "refused") auditFinal.current = true
      })
      .catch(() => {})
      .finally(() => {
        auditSending.current = false
      })
  }, [])

  const unsent = useCallback(
    () => (stranger.current ? 0 : unsentTrackerChanges()) + (auditStranger.current ? 0 : unsentAuditChanges()),
    [],
  )

  const onClick = useCallback(() => {
    if (phase.kind !== "idle") return
    stranger.current = false
    auditStranger.current = false
    auditRefused.current = []
    auditFinal.current = false
    if (unsent() === 0) {
      leave()
      return
    }
    setPhase({ kind: "sending" })
    if (unsentTrackerChanges() > 0 && !sendTrackerChangesNow()) setOwnSender(true)
    sendAudit()
    const started = Date.now()
    const look = () => {
      const left = unsent()
      if (left === 0) {
        setOwnSender(false)
        leave()
        return
      }
      const refused = auditFinal.current ? auditRefused.current : []
      // Nothing left that waiting could send: ask now rather than wait out the seconds.
      if (Date.now() - started >= SEND_BEFORE_LOG_OUT_MS || (refused.length > 0 && left <= refused.length)) {
        setPhase({ kind: "asking", left, refused })
        return
      }
      sendAudit()
      setTimeout(look, LOOK_EVERY_MS)
    }
    setTimeout(look, LOOK_EVERY_MS)
  }, [phase.kind, leave, sendAudit, unsent])

  const stay = useCallback(() => {
    setOwnSender(false)
    setPhase({ kind: "idle" })
  }, [])

  const refused = phase.kind === "asking" ? phase.refused : []
  const left = phase.kind === "asking" ? Math.max(0, phase.left - refused.length) : 0
  const all = left + refused.length
  return (
    <>
      {children({ onClick, busy: phase.kind === "sending" || phase.kind === "leaving" })}
      {ownSender && <SendTrackerChanges onStranger={onStranger} />}
      <Dialog open={phase.kind === "asking"} onOpenChange={(open) => !open && stay()}>
        <DialogContent className="sm:max-w-md" data-testid="log-out-unsent">
          <DialogTitle>Not saved to your account yet</DialogTitle>
          <DialogDescription>
            {left > 0 && (
              <>
                {left === 1 ? "1 change hasn't" : `${left} changes haven't`} reached your account yet, probably because there is
                no signal.{" "}
              </>
            )}
            {refused.length > 0 && (
              <>
                {refused.length === 1 ? "1 audit answer can't be saved:" : `${refused.length} audit answers can't be saved:`}
              </>
            )}
          </DialogDescription>
          {refused.length > 0 && (
            <ul className="space-y-0.5 text-sm" data-testid="log-out-not-kept">
              {refused.map(({ answer, reason, stored }) => (
                <li key={answer.id} data-testid="log-out-not-kept-item">
                  {clock(answer.slotAt)} · {answer.activity}: {reason}.
                  {/* both answers, so he knows what he would lose (alpha slow-pass-06); the audit page offers Keep that one / Use mine */}
                  {stored !== undefined && (
                    <span className="block text-muted-foreground">
                      Yours: E {answer.energy} · G {answer.growth}.{" "}
                      {stored ? `On the other device: ${stored.activity} · E ${stored.energy} · G ${stored.growth}.` : "Deleted on the other device."} Stay
                      signed in to choose on the audit page.
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-muted-foreground">Log out anyway and lose {all === 1 ? "it" : "them"}?</p>
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
