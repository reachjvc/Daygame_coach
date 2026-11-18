import { QUIT_ADDICTION_IDS, QUIT_TOOL_IDS, type QuitAddictionId } from "./types"

export const COUNT_STEPS = ["view", "start", "done"] as const
export type CountStep = (typeof COUNT_STEPS)[number]
export const COUNT_MAX_BYTES = 1024
export const SRC_PATTERN = /^[a-z0-9-]{1,20}$/

export interface CountEvent {
  addiction: QuitAddictionId
  tool: string
  step: CountStep
  src?: string
}

/** Whitelisted names only; anything else is rejected. */
export function parseCount(body: unknown): CountEvent | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null
  const b = body as Record<string, unknown>
  if (typeof b.addiction !== "string" || !(QUIT_ADDICTION_IDS as readonly string[]).includes(b.addiction)) return null
  if (typeof b.tool !== "string" || !(b.tool === "menu" || (QUIT_TOOL_IDS as readonly string[]).includes(b.tool))) return null
  if (typeof b.step !== "string" || !(COUNT_STEPS as readonly string[]).includes(b.step)) return null
  if (b.src !== undefined && (typeof b.src !== "string" || !SRC_PATTERN.test(b.src))) return null
  return {
    addiction: b.addiction as QuitAddictionId,
    tool: b.tool,
    step: b.step as CountStep,
    ...(b.src !== undefined ? { src: b.src as string } : {}),
  }
}
