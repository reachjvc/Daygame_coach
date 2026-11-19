import { BackLink } from "@/components/BackLink"
import { ROUTES } from "@/src/shared/routes"
import { cardOf, shownPeople } from "@/src/role-models/catalog"
import { ROLE_MODEL_CATEGORIES } from "@/src/role-models/categories"
import { CouncilStrip } from "@/src/role-models/components/CouncilStrip"
import { RoleModelGallery } from "@/src/role-models/components/RoleModelGallery"

/**
 * The role model library on the copy space (Plans/plan-new-from-real.md, Phase 4, item 9).
 *
 * The same page as `/plan/role-models`, mounted under `/plan/new`: the layout's guard aims the council's requests at
 * the copy space's own council, so choosing, ordering or removing a person here never touches the real one. Its
 * links stay under `/plan/new/role-models` (`RoleModelsHomeContext`, set by the shell).
 */
export const metadata = { title: "Role models" }

export default function PlanNewRoleModelsPage() {
  const cards = shownPeople().map(cardOf)
  const categories = ROLE_MODEL_CATEGORIES.map((c) => ({ id: c.id, label: c.label, description: c.description, color: c.color }))
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8" data-testid="role-models-page">
      <BackLink
        fallback={ROUTES.planNew}
        fallbackLabel="Plan"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      />
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-foreground">Role models</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Real people, shown whole: what each one stood for and how we know it, his own words with their exact
          place, where he started, and his shadow.
        </p>
      </header>
      <CouncilStrip cards={cards} />
      <RoleModelGallery cards={cards} categories={categories} />
    </main>
  )
}
