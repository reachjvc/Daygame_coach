/**
 * ONE HOME FOR HOW THE TRAINING SCREENS LOOK.
 *
 * Before this file, the same decision was typed out in a dozen places and then
 * drifted: the Training page was 3xl wide while the live workout was 2xl, cards
 * were padded twice over (a padded Card with a padded CardContent inside it),
 * and the green that means "done" was written by hand in sixteen files. When a
 * colour lives in sixteen files, fifteen of them are eventually wrong.
 *
 * This is deliberately a `.ts`, not a `.tsx`: it can hold class names and
 * nothing else. No component, no JSX, no logic. A screen that needs a new look
 * changes it here, once, and every training screen moves together.
 *
 * Every value below is built from the app's own colour tokens (primary, muted,
 * border, foreground) rather than a raw palette colour, so training can never
 * drift into a second colour scheme again. The one exception is the green of
 * "done" -- see `DONE` at the bottom.
 *
 * The rule that keeps it this way is a lint in tests/unit/architecture.test.ts
 * ("no NEW training file speaks a second visual language"), not this file.
 */

/**
 * The column every training screen sits in. /programs and /programs/live have
 * to be the same width, or moving between them looks like moving between two
 * different apps.
 */
export const TRAINING_COLUMN = 'mx-auto max-w-2xl px-4'

/**
 * A training card. `Card` already ships `py-4 sm:py-6 gap-4`
 * (components/ui/card.tsx), so a card that also pads its own body ends up with
 * a double gutter. These two strip the Card's own padding and hand it to the
 * body, so there is exactly one source of the gap.
 */
export const TRAINING_CARD = 'gap-0 py-0'
export const TRAINING_CARD_BODY = 'px-4 py-4'

/**
 * The live workout's lift card is tighter than the rest on purpose: during a
 * set you want as many rows on screen as will fit without squinting.
 */
export const LIFT_CARD_BODY = 'px-3 py-2.5'

/**
 * The "do this next" button: orange, but tinted rather than solid, so a screen
 * can offer an obvious action without shouting over the one real orange button.
 */
export const TINTED_BUTTON =
  'w-full border-primary/50 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary'

/**
 * The picked state of any choice chip (kg/lb, level, discipline, which day).
 * Written out by hand in TodayCard and copied from there by every screen that
 * needed the same look -- which is how copies start disagreeing.
 */
export const CHIP_ON = 'border-primary/50 bg-primary/10 text-primary'

/**
 * The grey block a card shows while its data is still coming. 92px is the
 * height of a loaded training card, so nothing jumps when the real one arrives.
 */
export const SKELETON = 'h-[92px] rounded-xl bg-muted/40 animate-pulse'

/**
 * "This did not load" / "this did not save". Amber, never red: red in this app
 * means destructive, and a request that failed is not something you did wrong.
 */
export const FAILED_LINE = 'flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400'

/** The small grey caption above a group of rows. */
export const SECTION_LABEL = 'text-xs uppercase tracking-wide text-muted-foreground'

/** The heading of a section inside a card. Every training section is this rank. */
export const SECTION_HEADING = 'text-sm font-semibold'

/**
 * The column captions on the live screen's set grid (KG · REPS · ✓). The only
 * 11px type allowed anywhere in training, and allowed only because these are
 * three words that never change and sit directly above the numbers they label.
 */
export const GRID_CAPTION = 'text-[11px] uppercase tracking-wider text-muted-foreground'

/**
 * GREEN MEANS DONE. Nothing else.
 *
 * This is the only place in the training screens where green exists. Orange is
 * "do this", amber is "that did not work", green is "finished" -- and a screen
 * that borrows green for "went up" or "good" takes the meaning away from the
 * ticks that need it. Emerald is a raw palette colour rather than a token
 * because the app has no "success" token; keeping it in one constant is what
 * stops that from mattering.
 */
export const DONE = {
  /** A set row you have ticked. */
  row: 'bg-emerald-500/10',
  /** The tick itself. */
  tick: 'border-emerald-500/50 bg-emerald-500/20 text-emerald-500',
  /** A day you trained, on the week strip and the progress calendar. */
  dot: 'bg-emerald-500',
  /** A word that says something is finished. */
  text: 'text-emerald-500',
  /** The panel that says a program is complete. */
  notice:
    'rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2 text-xs text-emerald-500',
} as const
