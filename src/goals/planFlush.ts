/**
 * A WAY FOR OTHER PARTS OF THE APP TO ASK THE PLAN PAGE TO SEND WHAT IT HOLDS.
 *
 * The plan page keeps edits for a few seconds before sending them. Log Out ends
 * the session and wipes this browser's copies, so unless the page is asked to
 * send first, what was typed in those seconds is lost (the send on `pagehide`
 * comes after sign-out and is refused). The page registers itself here while it
 * is open; Log Out asks it to send, waits for the answer, and counts what is
 * still unsent the way the time tracker's unsent changes are counted.
 */

export interface PlanPageSaver {
  /** Send the plan's and the day's waiting changes now; settles when the answers are in. */
  flush: () => Promise<void>
  /** How many changes the account has not accepted yet (0 when all is sent). */
  unsent: () => number
}

let saver: PlanPageSaver | null = null

/** Called by the open plan page. Returns the undo. */
export function registerPlanPage(next: PlanPageSaver): () => void {
  saver = next
  return () => {
    if (saver === next) saver = null
  }
}

/** Ask the open plan page, if any, to send everything now. */
export async function flushPlanPage(): Promise<void> {
  try {
    await saver?.flush()
  } catch {
    // A failed send shows up in `unsentPlanChanges`.
  }
}

/** What the open plan page has not got accepted; 0 when none is open. */
export function unsentPlanChanges(): number {
  try {
    return saver?.unsent() ?? 0
  } catch {
    return 0
  }
}
