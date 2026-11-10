import Link from "next/link"
import { ChevronRight, Heart } from "lucide-react"
import type { ProfileRow } from "@/src/db"
import { UserPreferences } from "@/src/profile/components"
import { hasDatingPreferences } from "@/src/profile/config"
import { ROUTES } from "@/src/shared/routes"

/**
 * YOUR DATING ANSWERS, ON YOU.
 *
 * They were the bottom half of the Dashboard, for payers only. Home replaced
 * the Dashboard and is about today, so they moved here
 * (Plans/site-navigation-build.md, Phase 2). Folded by default: the map and
 * the photo are long, and you come to You to change something, not to read
 * them every visit.
 *
 * Someone who has not answered gets the way to answer, not a summary of
 * defaults they never chose.
 */
export function DatingAnswers({ profile }: { profile: ProfileRow | null }) {
  const answered = hasDatingPreferences(profile)
  return (
    <section className="mb-6 rounded-xl border border-border bg-card" data-testid="you-dating-answers">
      <Link
        href={ROUTES.scenarioPreferences}
        className="flex min-h-12 items-center gap-3 px-4 py-3 hover:bg-muted/40"
        data-testid="you-dating-answers-link"
      >
        <Heart className="size-5 shrink-0 text-primary" aria-hidden />
        <span className="flex-1 text-sm text-foreground">
          {answered ? "Your dating answers" : "Answer the dating questions"}
          <span className="block text-xs text-muted-foreground">Who you want to practise with in scenarios</span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </Link>
      {profile && answered && (
        <details className="border-t border-border">
          <summary className="cursor-pointer px-4 py-3 text-sm text-muted-foreground hover:text-foreground">
            Show them here
          </summary>
          <div className="px-2 pb-4 sm:px-4">
            <UserPreferences
              age_range_start={profile.age_range_start ?? 22}
              age_range_end={profile.age_range_end ?? 25}
              archetype={profile.archetype ?? ""}
              secondary_archetype={profile.secondary_archetype ?? undefined}
              tertiary_archetype={profile.tertiary_archetype ?? undefined}
              dating_foreigners={profile.dating_foreigners ?? false}
              user_is_foreign={profile.user_is_foreign ?? undefined}
              preferred_region={profile.preferred_region ?? undefined}
              secondary_region={profile.secondary_region ?? undefined}
              primary_goal={profile.primary_goal ?? undefined}
            />
          </div>
        </details>
      )}
    </section>
  )
}
