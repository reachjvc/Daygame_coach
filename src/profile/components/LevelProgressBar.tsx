import { ComingSoon } from "@/src/shared/components/ComingSoon"

/**
 * Where the level and XP card used to be.
 *
 * It showed "Level N", a title badge, "X / Y XP to Level N+1" and a progress
 * bar. None of it was real. Verified against the live database on 2026-09-07:
 *
 *   - Nothing in the app has ever awarded XP or counted a completed scenario.
 *     `xp` and `scenarios_completed` are written by no code at all, so every
 *     account sat at 0 forever and the bar could never move.
 *   - `level` had exactly one writer -- the signup question "what is your
 *     experience level?" -- which stored 1/3/7/12/18 from a lookup table.
 *   - That table disagreed with the two other level formulas in the codebase.
 *     Three of the four real accounts showed a level their own XP contradicted;
 *     the only consistent one belonged to the user who never answered.
 *
 * So the card told a user their level was 7 while showing "0 / 100 XP" and an
 * empty bar that could never fill. Saying "coming soon" is the honest version.
 * When progression is built, this is the component to bring back.
 */
export function LevelProgressBar() {
  return (
    <ComingSoon
      title="Levels &amp; progress"
      description="Sessions, approaches and practice will feed a level that moves on its own. Nothing tracks it yet, so there is no number worth showing."
    />
  )
}
