"use client"

/**
 * THE QUIT-A-VICE MODULE AS IT WAS, ARCHIVED AND STILL WORKING.
 *
 * It was the whole of `/life-mastery/quit-vice` until 2026-09-20, when the
 * Black Box took the front door and this moved to `/life-mastery/quit-vice/old`
 * — unlinked except for one line at the foot of the new page. On 2026-09-24 the
 * owner retired it: *"You can retire anything you feel isnt useful, but keep it
 * in the test archives so i can access it later."* This is that.
 *
 * IT IS NOT A MOCK, and that is the point of archiving rather than deleting.
 * Same components, same six flows, same seven tools, same `quit-vice-v1` key in
 * this browser. **Anything the owner ever typed into these screens is still
 * here and still readable**, which is why no export was needed before the move:
 * the pages that read that key did not stop existing, they changed address.
 *
 * WHY IT WAS RETIRED, in the owner's own words from `docs/product/vice-concept.md`
 * item 7: "What is there now is more or less useless. Use the existing material
 * or the research to bolster the new thing, but be careful: AI wrote the rules
 * for vices, so they are not necessarily my real opinion." The line the plan
 * draws from that: a **research finding** with a source outside this repo
 * survives; a **product decision** AI made is taste and does not. The six
 * flows, the three copy versions, the nine-module learn spine, the shortlist
 * and the hub grouping are all taste.
 *
 * WHAT IS NOT YET CARRIED ACROSS, so nobody assumes it was — the audit is in
 * `docs/plans/vice-finished.md`, M2. Two things here have citations behind them
 * and no home on the Black Box yet: the **urge tool**'s four responses (the peer
 * corpus teaches "play the tape forward", 10 mentions against 4 for urge
 * surfing, which has a large failure literature), and **other people's
 * accounts** — 381 testimonials and 196 techniques, where reading others'
 * stories was the most-valued feature of a recovery community at 80.8%. The
 * Black Box reads none of the corpus today. Until it does, this archive is the
 * only way to either.
 *
 * `/test/*` answers 404 in production by design (`app/test/layout.tsx`). Nothing
 * is deployed today, so this is reachable; the day something is, this is a
 * localhost surface.
 */

import { ViceHub } from "@/src/vice/components/ViceHub"

export default function ArchivedQuitVicePage() {
  return <ViceHub />
}
