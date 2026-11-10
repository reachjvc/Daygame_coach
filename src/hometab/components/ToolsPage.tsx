import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight, Lock } from "lucide-react"
import { createServerSupabaseClient, getProfile } from "@/src/db/server"
import { COMING_TOOLS, TOOLS, type Tool } from "@/components/navTabs"
import { tileAccess, type ToolViewer } from "../tileAccess"

const GROUPS: { id: Tool["group"]; title: string }[] = [
  { id: "dating", title: "Dating" },
  { id: "life", title: "Life" },
]

/**
 * ALL TOOLS: EVERY TOOL IN ONE LIST, IN TWO GROUPS.
 *
 * It replaced the phone's More sheet and the laptop header's row of ten
 * links, neither of which had Inner Game or the Black Box. Grab's "All" tile
 * opens the same kind of page. The ☆ that puts a tool on Home comes in Phase 6
 * of Plans/site-navigation-build.md.
 */
export async function ToolsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const profile = await getProfile(user.id)
  const viewer: ToolViewer = { has_purchased: profile?.has_purchased ?? false }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10" data-testid="tools-page">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">All tools</h1>
      <p className="mb-6 text-sm text-muted-foreground">Everything in the app. A lock means it opens once you subscribe.</p>
      <div className="grid gap-8 md:grid-cols-2">
        {GROUPS.map((g) => (
          <section key={g.id} aria-labelledby={`tools-${g.id}`} data-testid={`tools-group-${g.id}`}>
            <h2 id={`tools-${g.id}`} className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</h2>
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {TOOLS.filter((t) => t.group === g.id).map((t) => {
                const access = tileAccess(t, viewer)
                return (
                  <li key={t.id}>
                    <Link href={access.href} className="flex min-h-12 items-center gap-3 px-4 py-3 hover:bg-muted/40" data-testid={`tools-row-${t.id}`} data-access={access.state}>
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
