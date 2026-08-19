"use client"

/**
 * Mirroring the plan to the server, from the browser.
 *
 * The flow saves to localStorage on every keystroke, and that stays the source
 * of truth: the server copy is for the people building this to see where real
 * plans get stuck, and it must never be able to break the page it is watching.
 * So everything here fails silently on the network and returns rather than
 * throwing — a snapshot that does not upload is a lost insight, and a snapshot
 * that throws is somebody's plan disappearing mid-sentence.
 *
 * The id is a random UUID minted in the browser. It is not an account, it says
 * nothing about who anybody is, and its only job is keeping one person's edits
 * on one row instead of ten thousand.
 */

const CLIENT_ID_KEY = "north-star-client-id"
const OPT_OUT_KEY = "north-star-no-sync"

/** Debounce: plans are typed into, and one row per keystroke is not a plan. */
export const SNAPSHOT_DEBOUNCE_MS = 4000

export function clientId(): string {
  let id = window.localStorage.getItem(CLIENT_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    window.localStorage.setItem(CLIENT_ID_KEY, id)
  }
  return id
}

export function syncIsOff(): boolean {
  return window.localStorage.getItem(OPT_OUT_KEY) === "1"
}

/**
 * Stop mirroring, and take down what this browser already sent.
 *
 * Turning it off has to remove the copy as well. An off switch that leaves
 * everything already collected sitting on a server is not an off switch.
 */
export async function stopSync(): Promise<void> {
  window.localStorage.setItem(OPT_OUT_KEY, "1")
  try {
    await fetch(`/api/plan-snapshots?clientId=${encodeURIComponent(clientId())}`, { method: "DELETE" })
  } catch {
    // Nothing to do and nothing to say: the local switch is already off.
  }
}

export function startSync(): void {
  window.localStorage.removeItem(OPT_OUT_KEY)
}

/** Send one snapshot. Resolves either way; never throws at the caller. */
export async function sendSnapshot(planJson: string, planText: string): Promise<boolean> {
  if (syncIsOff()) return false
  try {
    const res = await fetch("/api/plan-snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: clientId(), plan: JSON.parse(planJson), planText }),
    })
    return res.ok
  } catch {
    return false
  }
}
