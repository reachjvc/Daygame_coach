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
 * So are its deletes: one still inside its Undo time is sent (he is leaving,
 * and the dialog says so), and one the server refused is named like a refused
 * answer (review of 81f325e9).
 *
 * The header and the phone's More sheet each draw their own button; this owns
 * what pressing it does.
 */

import { useCallback, useRef, useState, useTransition, type ReactNode } from "react"

import { signOut } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { unsentAuditChanges, unsentAuditDeletes } from "@/src/audit/auditQueue"
import { forgetSessionInThisBrowser } from "@/src/db/authCookies"
import { forgetThisDevice } from "@/src/notifications/pushClient"
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
  | {
      kind: "asking"
      left: number
      refused: AuditSendOutcome["refused"]
      notDeleted: AuditSendOutcome["notDeleted"]
      undoSent: number
      /** Deletes not sent yet: named, since logging out keeps those answers (alpha p9-deletes-04) */
      deletes: ReturnType<typeof unsentAuditDeletes>
    }
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
  /** Audit deletes the account refused: named the same way */
  const auditNotDeleted = useRef<AuditSendOutcome["notDeleted"]>([])
  /** Deletes sent while still inside their Undo time */
  const auditUndoSent = useRef(0)
  const auditFinal = useRef(false)
  const [, startTransition] = useTransition()

  /**
   * LOGGING OUT ENDS THE SESSION ON THIS PHONE, SIGNAL OR NOT (alpha test
   * p9-offline-01). It wiped the copies first and then asked the server, so
   * with no signal the ask failed, a crash page said everything was safe, and
   * the phone was still signed in when signal came back. Now: what needs the
   * session goes first (its push address, the server's sign-out, a few seconds
   * at most), then the session's cookies leave this browser whatever the
   * network did, and only then is anything wiped.
   */
  const leave = useCallback(() => {
    setOwnSender(false)
    setPhase({ kind: "leaving" })
    startTransition(async () => {
      await forgetThisDevice()
      await Promise.race([signOut().catch(() => null), new Promise((done) => setTimeout(done, SEND_BEFORE_LOG_OUT_MS))])
      forgetSessionInThisBrowser()
      await forgetOfflineCopies({ deviceForgotten: true })
      window.location.replace("/")
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
        auditNotDeleted.current = result.notDeleted
        auditUndoSent.current += result.undoSent
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
    auditNotDeleted.current = []
    auditUndoSent.current = 0
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
      const notDeleted = auditFinal.current ? auditNotDeleted.current : []
      const named = refused.length + notDeleted.length
      // Nothing left that waiting could send: ask now rather than wait out the seconds.
      if (Date.now() - started >= SEND_BEFORE_LOG_OUT_MS || (named > 0 && left <= named)) {
        const deletes = auditStranger.current ? [] : unsentAuditDeletes()
        setPhase({ kind: "asking", left, refused, notDeleted, undoSent: auditUndoSent.current, deletes })
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
  const notDeleted = phase.kind === "asking" ? phase.notDeleted : []
  const undoSent = phase.kind === "asking" ? phase.undoSent : 0
  const deletes = phase.kind === "asking" ? phase.deletes : []
  const left = phase.kind === "asking" ? Math.max(0, phase.left - refused.length - notDeleted.length - deletes.length) : 0
  // a delete left behind loses nothing: the answer stays
  const lost = left + refused.length
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
            {notDeleted.length > 0 && (
              <>
                {" "}
                {notDeleted.length === 1 ? "1 audit answer can't be deleted:" : `${notDeleted.length} audit answers can't be deleted:`}
              </>
            )}
            {undoSent > 0 && (
              <>
                {" "}
                {undoSent === 1 ? "1 delete you could still undo was sent," : `${undoSent} deletes you could still undo were sent,`} as you are
                logging out.
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
          {notDeleted.length > 0 && (
            <ul className="space-y-0.5 text-sm" data-testid="log-out-not-deleted">
              {notDeleted.map(({ id, slotAt, activity, reason, stored }) => (
                <li key={id} data-testid="log-out-not-deleted-item">
                  {slotAt ? `${clock(slotAt)} · ` : ""}
                  {activity ? `Delete ${activity}` : "A delete"}: {reason}.
                  {stored && (
                    <span className="block text-muted-foreground">
                      Now on the other device: {stored.activity} · E {stored.energy} · G {stored.growth}. Stay signed in to choose on the audit page.
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {deletes.length > 0 && (
            <ul className="space-y-0.5 text-sm" data-testid="log-out-delete-waiting">
              {deletes.map(({ id, slotAt, activity }) => (
                <li key={id} data-testid="log-out-delete-waiting-item">
                  {slotAt ? `${clock(slotAt)} · ` : ""}
                  {activity ?? "An answer"}: delete not sent; logging out keeps this answer.
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-muted-foreground">{lost > 0 ? `Log out anyway and lose ${lost === 1 ? "it" : "them"}?` : "Log out anyway?"}</p>
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
