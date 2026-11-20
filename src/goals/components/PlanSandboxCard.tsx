import Link from "next/link"
import { ChevronRight, FlaskConical } from "lucide-react"
import { ROUTES } from "@/src/shared/routes"

/**
 * THE WAY INTO THE COPY SPACE, drawn on Settings only for an account that has
 * one (`hasPlanSandbox`). Everyone else never sees it, and the page itself
 * answers 404 to them.
 */
export function PlanSandboxCard() {
  return (
    <section className="mb-6 rounded-xl border border-border bg-card" data-testid="plan-sandbox-card">
      <Link
        href={ROUTES.backstage}
        className="flex min-h-12 items-center gap-3 border-b border-border px-4 py-3 hover:bg-muted/40"
        data-testid="backstage-card-link"
      >
        <FlaskConical className="size-5 shrink-0 text-primary" aria-hidden />
        <span className="flex-1 text-sm text-foreground">
          Backstage
          <span className="block text-xs text-muted-foreground">Everything live but hidden from other users, in one list. Only you see it.</span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </Link>
      <Link
        href={ROUTES.planSandbox}
        className="flex min-h-12 items-center gap-3 px-4 py-3 hover:bg-muted/40"
        data-testid="plan-sandbox-card-link"
      >
        <FlaskConical className="size-5 shrink-0 text-primary" aria-hidden />
        <span className="flex-1 text-sm text-foreground">
          Plan copy space
          <span className="block text-xs text-muted-foreground">Try the plan on a copy of yours, or as a brand-new user. Your real plan is not touched.</span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </Link>
      <Link
        href={ROUTES.planNew}
        className="flex min-h-12 items-center gap-3 border-t border-border px-4 py-3 hover:bg-muted/40"
        data-testid="plan-new-card-link"
      >
        <FlaskConical className="size-5 shrink-0 text-primary" aria-hidden />
        <span className="flex-1 text-sm text-foreground">
          New version of the plan
          <span className="block text-xs text-muted-foreground">The plan in steps, on the same copy. Your real plan is not touched.</span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </Link>
    </section>
  )
}
