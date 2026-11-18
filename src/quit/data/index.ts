import alcohol from "./alcohol.json"
import live from "./live.json"
import nicotine from "./nicotine.json"
import porn from "./porn.json"
import weed from "./weed.json"
import type { QuitAddiction, QuitAddictionId } from "../types"

const FILES: Partial<Record<QuitAddictionId, unknown>> = { nicotine, weed, porn, alcohol }

export function getAddiction(id: QuitAddictionId): QuitAddiction | null {
  return (FILES[id] as QuitAddiction | undefined) ?? null
}

/** Addictions whose file is finished and shown to readers. */
export function liveIds(): QuitAddictionId[] {
  return live as QuitAddictionId[]
}

export function isLive(id: QuitAddictionId): boolean {
  return liveIds().includes(id)
}
