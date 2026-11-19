import frameJson from "./data/frame.json"
import menuJson from "./data/menu.json"
import finishedJson from "./data/finished.json"
import liveToolsJson from "./data/liveTools.json"
import { getAddiction, isLive, liveIds } from "./data"
import { QUIT_ADDICTION_IDS, type QuitAddictionId, type QuitFrameText, type QuitMenu, type QuitMenuTool } from "./types"

export const menu = menuJson as unknown as QuitMenu
export const frame = frameJson as QuitFrameText

export function isAddictionId(x: string): x is QuitAddictionId {
  return (QUIT_ADDICTION_IDS as readonly string[]).includes(x)
}

/** Development and test show unbuilt files; production only with `?preview=1` (a dev aid: no link needs it). */
export function previewAllowed(preview: boolean): boolean {
  return process.env.NODE_ENV !== "production" || preview
}

/** Live ids first, then (when previews are allowed) the ids that have a data file. */
export function viewableIds(preview: boolean): QuitAddictionId[] {
  const live = liveIds()
  const rest = previewAllowed(preview)
    ? QUIT_ADDICTION_IDS.filter((id) => !isLive(id) && getAddiction(id) !== null)
    : []
  return [...live, ...rest]
}

export function isViewable(id: string, preview: boolean): id is QuitAddictionId {
  return isAddictionId(id) && viewableIds(preview).includes(id)
}

export function toolName(tool: QuitMenuTool, id: QuitAddictionId): string {
  return tool.name.replace("{lies}", menu.addictions[id].lies)
}

export function minutesText(minutes: number | string | null): string | null {
  if (minutes === null) return null
  return typeof minutes === "number" ? `${minutes} ${frame.minutes}` : minutes
}

export function findMenuTool(toolId: string): QuitMenuTool | null {
  for (const g of menu.groups) for (const t of g.tools) if (t.id === toolId) return t
  return null
}

/** Carries `?preview=1` along the links of a previewed menu. */
export function previewSuffix(preview: boolean, present = false): string {
  const parts = [preview ? "preview=1" : "", present ? "present=1" : ""].filter(Boolean)
  return parts.length > 0 ? `?${parts.join("&")}` : ""
}

/** A `?name=1` flag from a page's search params; a repeated flag (`?preview=1&preview=1`) counts once. */
export function isFlag(value: string | string[] | undefined): boolean {
  return Array.isArray(value) ? value.includes("1") : value === "1"
}

/** Tool ids that are finished; every other menu row shows "Soon" and is not a link. */
export function finishedToolIds(): string[] {
  return finishedJson as string[]
}

export function isFinished(toolId: string): boolean {
  return finishedToolIds().includes(toolId)
}

/**
 * Tool ids that are built and open to everyone (`data/liveTools.json`). Drives which menu rows are links and which
 * tool pages answer without `?preview=1`. Separate from finished.json, which means "the owner said done".
 */
export function liveToolIds(): string[] {
  return liveToolsJson as string[]
}

export function isLiveTool(toolId: string): boolean {
  return liveToolIds().includes(toolId)
}

/** A tool page opens when the tool is live, or (dev aid) when previews are allowed. */
export function toolReachable(toolId: string, preview: boolean): boolean {
  return isLiveTool(toolId) || previewAllowed(preview)
}

/** An internal quit address with the preview flag kept (`?preview=1`), joining an existing query when there is one. */
export function withPreview(href: string, preview: boolean): string {
  if (!preview) return href
  return href + (href.includes("?") ? "&" : "?") + "preview=1"
}
