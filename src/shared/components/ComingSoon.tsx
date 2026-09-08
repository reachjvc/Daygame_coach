/**
 * One place that owns how an unbuilt feature is shown.
 *
 * The experience/level/XP progression was wired into five screens and none of it
 * worked: nothing in the app ever awarded a point or counted a scenario, so
 * `xp` sat at 0 for every account forever, while `level` was set once from the
 * signup question using a formula the progress bar disagreed with. Measured on
 * the live database 2026-09-07: three of four real accounts showed a level their
 * own XP contradicted, and the only correct one belonged to the person who never
 * answered the question.
 *
 * Showing a number that means nothing is worse than showing nothing, so these
 * places say so plainly instead. When progression is actually built, this
 * component is the list of everywhere it has to land.
 */

interface ComingSoonProps {
  /** What is coming. Keep it a noun phrase: "Experience & levels". */
  title: string
  /** One line on what it will do. Optional for the compact variant. */
  description?: string
  /**
   * `panel` fills a card (onboarding step, dashboard widget).
   * `row` replaces a single labelled value in a settings list.
   */
  variant?: "panel" | "row"
  className?: string
}

export function ComingSoon({
  title,
  description,
  variant = "panel",
  className = "",
}: ComingSoonProps) {
  if (variant === "row") {
    return (
      <div className={className} data-testid="coming-soon">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="mr-2 inline-block rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Coming soon
          </span>
          {description}
        </p>
      </div>
    )
  }

  return (
    <div
      className={`flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center ${className}`}
      data-testid="coming-soon"
    >
      <span className="mb-3 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Coming soon
      </span>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}
