import type { Tool } from "@/components/navTabs"
import { withReturn } from "@/src/shared/returnTo"

/**
 * Where a locked tool sends somebody: the plans on the front page. They have
 * an account, so not to sign-up — the Dashboard learned that one the hard way.
 */
export const PAYWALL_HREF = "/#pricing"

/** What Home and All tools need to know about who is looking. Nothing more. */
export interface ToolViewer {
  has_purchased: boolean
}

export type TileState =
  /** A plain link to the tool. */
  | { state: "open"; href: string }
  /** A link to the tool, with a lock badge: the tool shows a preview. */
  | { state: "preview"; href: string }
  /** The tool would turn them away, so the tile opens the plans instead. */
  | { state: "locked"; href: string }

/**
 * THE ONE PLACE THAT DECIDES WHETHER A TILE OPENS ITS TOOL.
 *
 * Ask Coach sends anyone who has not paid back to Home with nothing said
 * (`app/(app)/coach/page.tsx`). A Coach tile that linked straight there would
 * be a tile that does nothing. So a locked tile shows a lock and opens the
 * plans, never a silent bounce.
 *
 * The payment model may change (a cheap tier, scenario packs); when it does,
 * this function and `Tool.access` change, and no tile does.
 */
export function tileAccess(tool: Pick<Tool, "href" | "access">, viewer: ToolViewer | null, from?: string): TileState {
  const paid = viewer?.has_purchased === true
  /* `from`: the page the tile is on, carried on the link so the tool's own
     back control says "← Home" and goes there. Without it the Black Box
     said "← Life Mastery" and sent you into the plan (Phase 4 audit). */
  const href = from ? withReturn(tool.href, from) : tool.href
  if (tool.access === "open" || paid) return { state: "open", href }
  if (tool.access === "preview") return { state: "preview", href }
  return { state: "locked", href: PAYWALL_HREF }
}
