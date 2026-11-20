import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { createServerSupabaseClient } from "@/src/db/server"
import { hasPlanSandbox } from "@/src/db/planSandbox"
import { backstageSections } from "@/src/backstage/backstageLinks"
import { ROUTES } from "@/src/shared/routes"

export const metadata: Metadata = { title: "Backstage", robots: { index: false } }

/**
 * BACKSTAGE: the owner's list of everything live but hidden (`src/backstage/backstageLinks.ts`).
 * Only an account with a `plan_sandboxes` row opens it; anyone else gets a 404, as on `/plan/new`.
 */
export default async function BackstagePage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(ROUTES.backstage)}`)
  if (!(await hasPlanSandbox({ userId: user.id, supabase }))) notFound()

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10" data-testid="backstage-page">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Backstage</h1>
      <p className="mb-6 text-sm text-muted-foreground">Everything that works on the live site but is hidden from other users. Only your account sees this page.</p>
      <div className="space-y-8">
        {backstageSections().map((section) => (
          <section key={section.id} aria-labelledby={`backstage-${section.id}`} data-testid={`backstage-section-${section.id}`}>
            <h2 id={`backstage-${section.id}`} className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{section.title}</h2>
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {section.links.map((link) => (
                <li key={link.id}>
                  <Link href={link.href} className="flex min-h-12 items-center gap-3 px-4 py-3 hover:bg-muted/40" data-testid={`backstage-link-${link.id}`}>
                    <span className="min-w-0 flex-1 text-sm text-foreground">
                      {link.label}
                      <span className="block text-xs text-muted-foreground">{link.note}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
