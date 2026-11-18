import frameJson from "./data/frame.json"
import menuJson from "./data/menu.json"
import { getAddiction, isLive, liveIds } from "./data"
import { QUIT_ADDICTION_IDS, type QuitAddictionId, type QuitFrameText, type QuitMenu, type QuitMenuTool } from "./types"

export const menu = menuJson as unknown as QuitMenu
export const frame = frameJson as QuitFrameText

export function isAddictionId(x: string): x is QuitAddictionId {
  return (QUIT_ADDICTION_IDS as readonly string[]).includes(x)
}

/** Development and test show unfinished files; production only with `?preview=1`. */
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
export function previewSuffix(preview: boolean): string {
  return preview ? "?preview=1" : ""
}
