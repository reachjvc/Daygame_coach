import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight, FlaskConical, Lock } from "lucide-react"
import { createServerSupabaseClient, getProfile } from "@/src/db/server"
import { hasPlanSandbox } from "@/src/db/planSandbox"
import { COMING_TOOLS, TOOLS, type Tool } from "@/components/navTabs"
import { tileAccess, type ToolViewer } from "../tileAccess"
import { ROUTES } from "@/src/shared/routes"
import { facetFor } from "@/src/shared/facets"

/** W50: Life, Quit, Dating, in that order (Plans/rebrand-10kdaysclub.md, Phase 6). */
const GROUPS: { id: Tool["group"]; title: string }[] = [
  { id: "life", title: "Life" },
  { id: "quit", title: "Quit" },
  { id: "dating", title: "Dating" },
]

/**
 * ALL TOOLS: EVERY TOOL IN ONE LIST, IN THREE GROUPS.
 *
 * With `group`, one part only: the Dating tile on Home opens `/tools/dating`
 * (W51), the same rows under their own heading.
 *
 * It replaced the phone's More sheet and the laptop header's row of ten
 * links, neither of which had Inner Game or the Black Box. Grab's "All" tile
 * opens the same kind of page. The ☆ that puts a tool on Home comes in Phase 6
 * of Plans/site-navigation-build.md.
 */
export async function ToolsPage({ group }: { group?: Tool["group"] } = {}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const [profile, owner] = await Promise.all([getProfile(user.id), group ? false : hasPlanSandbox({ userId: user.id, supabase })])
  const viewer: ToolViewer = { has_purchased: profile?.has_purchased ?? false }
  const groups = group ? GROUPS.filter((g) => g.id === group) : GROUPS
  const from = group === "dating" ? ROUTES.datingTools : ROUTES.tools

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10" data-testid="tools-page">
      {group === "dating" ? (
        <>
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Dating</h1>
          <p className="mb-6 text-sm text-muted-foreground">Practise at home, go out, look back.</p>
        </>
      ) : (
        <>
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">All tools</h1>
          <p className="mb-6 text-sm text-muted-foreground">Everything in the app. A lock means it opens once you subscribe.</p>
        </>
      )}
      {owner && (
        <Link href={ROUTES.backstage} className="mb-8 flex min-h-12 items-center gap-3 rounded-xl border border-primary/40 bg-card px-4 py-3 hover:bg-muted/40" data-testid="tools-backstage">
          <FlaskConical className="size-5 shrink-0 text-primary" aria-hidden />
          <span className="flex-1 text-sm text-foreground">
            Backstage
            <span className="block text-xs text-muted-foreground">Everything live but hidden from other users. Only you see this row.</span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
        </Link>
      )}
      <div className={`grid gap-8 ${group ? "" : "md:grid-cols-2"}`}>
        {groups.map((g) => (
          <section key={g.id} aria-labelledby={group ? undefined : `tools-${g.id}`} aria-label={group ? g.title : undefined} data-testid={`tools-group-${g.id}`}>
            {!group && <h2 id={`tools-${g.id}`} className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</h2>}
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {TOOLS.filter((t) => t.group === g.id).map((t) => {
                const access = tileAccess(t, viewer, from)
                return (
                  <li key={t.id}>
                    <Link href={access.href} className="flex min-h-12 items-center gap-3 px-4 py-3 hover:bg-muted/40" data-testid={`tools-row-${t.id}`} data-access={access.state} data-facet={facetFor(t.href)}>
                      <t.icon className="size-5 shrink-0 text-primary" aria-hidden />
                      <span className="flex-1 text-sm text-foreground">{t.label}</span>
                      {access.state === "locked" && <span className="text-xs text-muted-foreground">See plans</span>}
                      {access.state !== "open" && <Lock className="size-4 text-muted-foreground" aria-label={access.state === "locked" ? "Locked" : "Preview"} />}
                      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                )
              })}
              {COMING_TOOLS.filter((t) => t.group === g.id).map((t) => (
                <li key={t.label} className="flex min-h-12 items-center gap-3 px-4 py-3 text-muted-foreground" data-testid="tools-row-coming">
                  <t.icon className="size-5 shrink-0" aria-hidden />
                  <span className="flex-1 text-sm">{t.label}</span>
                  <span className="text-xs">Coming soon</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  )
}
