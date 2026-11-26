# Brand and look

## The name

**10K Days Club, on 10kdaysclub.com** (his decision, 2026-11-18): "all branding
should reflect this broader market now ... the landing page should not say AI
daygame coaching."

What it means, his words (2026-11-22):
- "the philosophy about 10k club is not primarily 27 years. It is far too long."
- "10K Days Club … is about mastery. Some say mastery takes 10.000 hours, 10.000
  iterations. The 10k days club is about moving towards our long-term objectives.
  About becoming the man, the woman, the person that we desire to be."
- "The 10k Days Club combines long-term thinking with short-term
  operationability. Ask yourself: in 3 years, 10 years, 30 years, what do you want
  to have accomplished? what is that big goal of yours, that once you achieve you
  want to scream out "I did it!"?"

Campaign line he likes (2026-10-16): **"Ten years from now, you might be able to
say… I DID IT."** It comes from the audience's own words (private source:
`~/research/change-your-life/02-comment-language-bank.md`).

## The umbrella (2026-11-19)

- (Claude's summary) Dating is one part users click into; another is the broader
  life part (the plan, the time tools, the activity tracking); the quit part sits
  inside the broader life. "So what i think we need is to decide on a coherent brand that
  can be an umbrella for all of this."
- "I would not want to label it only quit, or quit first just because we're
  trying to sell something soonish ... Also, users will be directed to the quit
  tools specifically, not the front page anyway."
- "Men primarily, but no reason to entirely exclude women."
- "For dating & Daygame, ive been very fond of the current color and design
  scheme. I think it works quite well. It may also work for the brand in general."

## The look

One brand with three parts: Life, Quit and Dating. He picked "look C"
(2026-11-19) and asked for rules that keep it coherent long term. On 2026-11-25
he asked for the orange (`#ff6b35`) back on every page. Each part keeps its own
colour token (`--facet-life`, `--facet-quit`, `--facet-dating`, `--facet-brand`),
so a part can get its own colour again in one line of `app/globals.css`. Which
addresses belong to which part: `src/shared/facets.ts`.

The five rules (Claude wrote them, he kept them, 2026-11-19), each with what enforces it:

**R1. Every colour comes from the theme file.** Use tokens (`primary`,
`muted-foreground`, `border` …), never a Tailwind palette class or a raw hex
colour in a page. *Held by* `tests/unit/shared/colourRatchet.test.ts`: a file's
count may only fall.

**R2. A part's colour is chosen by an address, never by hand.** A page by its own
address; a tile, card, row or door by the address it opens
(`data-facet={facetFor(href)}`). *Held by* `tests/unit/shared/facets.test.ts`.

**R3. One name, one logo.** The name is typed only in `src/shared/brand.ts` (and
the JSON data files); the mark is drawn only in `components/BrandMark.tsx`.
*Held by* `tests/unit/shared/brandName.test.ts`.

**R4. Every page title reads "<Page> · 10K Days Club".** Each page sets
`metadata.title` (a `"use client"` page through a sibling `layout.tsx`).
*Held by* `tests/unit/shared/pageTitles.test.ts`.

**R5. The same building blocks everywhere.** Buttons, cards, inputs and tabs come
from `components/ui/`. *Held by* review: check it on every UI change.
