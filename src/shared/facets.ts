import { ROUTES, isUnder } from "./routes"

/**
 * WHICH PART OF THE SITE AN ADDRESS BELONGS TO (Plans/rebrand-10kdaysclub.md, Phase 3).
 *
 * The site is one brand with three parts, each a sub-brand in its own colour
 * (look C, picked by the owner on 2026-11-19): Life gold, Quit violet, Dating
 * orange. "brand" is everything that belongs to no part: the front page, Home,
 * All tools, You, sign-in, prices.
 *
 * Rule R2 of docs/product/look.md: a part's colour is chosen by an address,
 * never by hand. A page takes the part of its own address (`FacetScope` in the
 * root layout sets `data-facet`); a tile, card, row or door takes the part of
 * the address it opens (`data-facet={facetFor(href)}`). CSS does the rest:
 * `[data-facet=…]` swaps `--primary`, so every `bg-primary`, `text-primary` and
 * focus ring inside follows.
 */
export type Facet = "brand" | "life" | "quit" | "dating"

export const FACETS: readonly Facet[] = ["brand", "life", "quit", "dating"]

/** The part's name in its lockup, "10K Days · Life". `brand` has none. */
export const FACET_LABEL: Record<Exclude<Facet, "brand">, string> = {
  life: "Life",
  quit: "Quit",
  dating: "Dating",
}

/**
 * Public pages outside `ROUTES` (that file holds signed-in pages only). The
 * three part doors and the prices page join `ROUTES` when they are built
 * (Phase 5); until then their addresses are named once, here.
 */
const QUIT_DOOR = "/quit"
const LIFE_DOOR = "/life"
const DATING_DOOR = "/dating"
const DATING_TOOLS = `${ROUTES.tools}/dating`

/** Order matters: the exceptions (quit-vice under plan, daily under tracking) come first. */
const MAP: readonly (readonly [string, Facet])[] = [
  [ROUTES.quitVice, "quit"],
  [QUIT_DOOR, "quit"],
  [ROUTES.trackingDaily, "life"],
  [LIFE_DOOR, "life"],
  [ROUTES.plan, "life"],
  [ROUTES.training, "life"],
  [ROUTES.time, "life"],
  [ROUTES.audit, "life"],
  [DATING_DOOR, "dating"],
  [DATING_TOOLS, "dating"],
  [ROUTES.scenarios, "dating"],
  [ROUTES.coach, "dating"],
  [ROUTES.innerGame, "dating"],
  [ROUTES.articles, "dating"],
  [ROUTES.tracking, "dating"],
]

/** The part an address belongs to. Takes a full href too: query and hash are ignored. */
export function facetFor(href: string): Facet {
  const pathname = href.split(/[?#]/)[0] || "/"
  for (const [prefix, facet] of MAP) if (isUnder(pathname, prefix)) return facet
  return "brand"
}
