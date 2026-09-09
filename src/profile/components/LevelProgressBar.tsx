import { Card } from "@/components/ui/card"
import { Crown, Gauge } from "lucide-react"

/**
 * The dashboard's level card, with its numbers removed.
 *
 * WHY THERE IS NO LEVEL HERE
 *
 * Verified against the live database on 2026-09-07: nothing in the app has ever
 * awarded XP or counted a completed scenario. `xp` and `scenarios_completed` are
 * written by no code at all, so every account sat at 0 forever and the bar could
 * never move. `level` had exactly one writer -- the signup question "what is your
 * experience level?" -- which stored 1/3/7/12/18 from a lookup table that
 * disagreed with the two other level formulas in the codebase. Three of the four
 * real accounts showed a level their own XP contradicted.
 *
 * So the card told a user they were Level 7 while showing "0 / 100 XP" and an
 * empty bar that could never fill.
 *
 * WHY THE CARD IS STILL HERE
 *
 * The chrome was never the problem -- the numbers were. The crown, the gauge and
 * the meter say "progression lives here", which is true and stays true. What is
 * gone is every value that would have to be measured to be honest: no level, no
 * XP total, no scenario count, no percentage. The meter renders as an empty
 * dashed track with no fill element at all, so it reads as an outline of a
 * feature rather than a reading of zero.
 *
 * A count that cannot be computed is a third state, never 0 -- hence the em dash
 * beside the gauge.
 *
 * THE CARD CARRIES NO EXPLANATORY COPY, AND THAT IS A DECISION
 *
 * Earlier drafts said "Sessions, approaches and practice will feed a level" under
 * the title and "Nothing tracks this yet" under the meter. Both were cut on
 * 2026-09-08: the first was written from the inside of the codebase and made no
 * sense to a customer, and the user chose the minimal card over a rewritten one.
 * The COMING SOON badge is the whole explanation.
 *
 * The known cost, accepted deliberately: nothing on the card tells a beta tester
 * why the meter is empty or why the gauge reads "--", so an empty bar can be
 * reported as a bug. If those reports start arriving, the fix is a line of copy
 * here, not a number.
 *
 * When progression is built, the places it has to land are this card, the
 * Settings "Your Progress" card, the dashboard preferences row, and onboarding
 * step 4. (The Lair's LevelProgressWidget was a fifth; the Lair was deleted on
 * 2026-09-09.) Guarded by
 * tests/unit/profile/levelProgressBar.test.tsx, which fails if a digit returns.
 */
export function LevelProgressBar() {
  return (
    <Card
      className="bg-gradient-to-r from-card to-card/50 border-border p-4"
      data-testid="coming-soon"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary">
            <Crown className="size-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-foreground">Levels &amp; progress</h3>
              <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Coming soon
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Gauge className="size-4" />
            <span className="font-semibold" aria-label="not tracked yet">
              &mdash;
            </span>
          </div>
          <p className="text-xs text-muted-foreground">scenarios</p>
        </div>
      </div>

      {/* Deliberately empty: no fill element, dashed rather than solid, so it
          cannot be misread as a real measurement sitting at zero. */}
      <div className="h-3 rounded-full border border-dashed border-border bg-background/60" />
    </Card>
  )
}
