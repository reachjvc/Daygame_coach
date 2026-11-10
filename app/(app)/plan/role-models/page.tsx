import { BackLink } from "@/components/BackLink"
import { ROUTES } from "@/src/shared/routes"
import { cardOf, shownPeople } from "@/src/role-models/catalog"
import { ROLE_MODEL_CATEGORIES } from "@/src/role-models/categories"
import { CouncilStrip } from "@/src/role-models/components/CouncilStrip"
import { RoleModelGallery } from "@/src/role-models/components/RoleModelGallery"

/**
 * The role model library (Plans/role-models.md, Phase 5).
 *
 * The catalogue is files bundled at build time (D1): this page reads no
 * database. The sign-in gate is the plan layout's. Only card fields go to the
 * browser; whole profiles live on their own pages.
 */
export const metadata = { title: "Role models" }

export default function RoleModelsPage() {
  const cards = shownPeople().map(cardOf)
  const categories = ROLE_MODEL_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8" data-testid="role-models-page">
      <BackLink fallback={ROUTES.plan} fallbackLabel="Your plan" />
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
