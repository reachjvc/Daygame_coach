"use client"

import { ComingSoon } from "@/src/shared/components/ComingSoon"

/**
 * The Lair's level widget. Now a placeholder, for the same reason as
 * LevelProgressBar and the Settings progress card.
 *
 * This one carried a FOURTH level formula -- `XP_PER_LEVEL`, with its own
 * five-name title list ("Rookie / Apprentice / Practitioner / Expert / Master")
 * that did not match the six-name list on the dashboard either. It fetched a
 * profile on mount to render numbers that nothing in the app has ever
 * incremented: `xp` and `scenarios_completed` are written by no code at all.
 *
 * A code review caught that this widget was missed when the other four level
 * surfaces were replaced, which is the exact failure ComingSoon's docblock
 * warns about -- so it is worth repeating here: when progression is built, the
 * places it has to land are this widget, LevelProgressBar, the Settings
 * "Your Progress" card, the dashboard preferences row, and onboarding step 4.
 */
export function LevelProgressWidget() {
  return (
    <ComingSoon
      title="Levels &amp; progress"
      description="Nothing feeds a level yet, so there is no number worth showing here."
    />
  )
}
