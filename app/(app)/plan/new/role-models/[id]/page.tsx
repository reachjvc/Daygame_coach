import { notFound } from "next/navigation"

import { ROUTES } from "@/src/shared/routes"
import { shownPeople, shownPerson, valueWordsOf } from "@/src/role-models/catalog"
import { CouncilButton } from "@/src/role-models/components/CouncilButton"
import { RoleModelProfile } from "@/src/role-models/components/RoleModelProfile"

/** One role model's profile on the copy space: the same page as `/plan/role-models/<id>`, with the copy space's council. */
export function generateStaticParams() {
  return shownPeople().map((p) => ({ id: p.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const person = shownPerson(id)
  return { title: person ? `${person.name} · Role models` : "Role models" }
}

export default async function PlanNewRoleModelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const person = shownPerson(id)
  if (!person) notFound()
  return (
    <RoleModelProfile
      person={person}
      libraryHref={ROUTES.planNewRoleModels}
      council={<CouncilButton id={person.id} name={person.name} values={valueWordsOf(person)} pronoun={person.pronoun} />}
    />
  )
}
