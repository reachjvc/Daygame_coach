# The look: one brand, three parts

10K Days Club is one brand with three parts, each a sub-brand in its own colour. The owner picked this ("look C",
2026-11-19, on the looks page of `Plans/rebrand-10kdaysclub.md`) and asked for rules that keep it coherent long term.
The five rules below are his (kept on 2026-11-19). Each names what holds it.

| Part | Lockup | Colour | Token |
|---|---|---|---|
| Life | 10K Days · Life | orange `#ff6b35` (gold `#f5c542` until 2026-11-25) | `--facet-life` |
| Quit | 10K Days · Quit | orange `#ff6b35` (violet `#a78bfa` until 2026-11-25) | `--facet-quit` |
| Dating | 10K Days · Dating | orange `#ff6b35` | `--facet-dating` |
| Umbrella (no part) | 10K Days Club | orange `#ff6b35`, picked on the brand board (2026-11-19); the mark always wears it | `--facet-brand` |

On 2026-11-25 the owner asked for the orange back on every page, as before the rebrand. The parts keep their own
tokens, so a part can take its own colour again in one line of `app/globals.css`.

Which addresses belong to which part: `src/shared/facets.ts`. Text on a part colour is `#121212`.

## How it works

- `components/FacetScope.tsx` (root layout) sets `data-facet` from the page's address. In `app/globals.css`,
  `[data-facet=…]` swaps `--primary`, `--primary-foreground` and `--ring`, so every `bg-primary`, `text-primary` and
  focus ring on the page takes the part's colour without the page knowing.
- Something that leads into a part (a Home tile, a Home card, an All tools row, a front-page door) carries
  `data-facet={facetFor(href)}` for the address it opens, so it shows that part's colour wherever it sits.
- Inside a part, the header shows the lockup (`PartLockup` in `components/AppLogo.tsx`).

## The rules

**R1. Every colour comes from the theme file.** Use tokens (`primary`, `muted-foreground`, `border`, `success`,
`destructive`, …), never a Tailwind palette class (`text-orange-400`) or a raw `#rrggbb` in a page.
*Held by* `tests/unit/shared/colourRatchet.test.ts` against `tests/unit/shared/colour-baseline.json`: a file's count
may only fall, a new file starts at 0. The baseline holds what existed on 2026-11-19; it forbids new ones and does
not demand a rewrite. After removing some, lower it: `UPDATE_COLOUR_BASELINE=1 npx vitest run
tests/unit/shared/colourRatchet.test.ts`.

**R2. A part's colour is chosen by an address, never by hand.** A page by its own address, a tile, card, row or
door by the address it opens. Never write `data-facet="life"` or a part's hex value by hand.
*Held by* `tests/unit/shared/facets.test.ts`.

**R3. One name, one logo.** The name is typed only in `src/shared/brand.ts` (and the JSON data files); everything
reads `BRAND`. The mark is drawn only in `components/BrandMark.tsx`; everything renders `<BrandMark/>`.
*Held by* `tests/unit/shared/brandName.test.ts`.

**R4. Every page title reads "<Page> · 10K Days Club".** The root layout's template adds the brand; each page sets
`metadata.title` (a `"use client"` page through a sibling `layout.tsx`). Only a short list keeps the bare default.
*Held by* `tests/unit/shared/pageTitles.test.ts`.

**R5. The same building blocks everywhere.** Buttons, cards, inputs and tabs come from `components/ui/`. No page
draws its own button. *Held by* review: check it on every UI change.
