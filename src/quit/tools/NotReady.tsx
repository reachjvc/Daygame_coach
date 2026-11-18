import { tooltext as t } from "../tooltext"

/** Shown when a topic's data file still has "TODO" where a tool needs content. */
export function NotReady() {
  return (
    <p data-testid="not-ready" className="rounded-lg border border-border bg-card p-4 text-muted-foreground">
      {t.common.notReady}
    </p>
  )
}
