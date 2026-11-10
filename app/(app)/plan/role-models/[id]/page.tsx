import { notFound } from "next/navigation"

import { shownPeople, shownPerson, valueWordsOf } from "@/src/role-models/catalog"
import { CouncilButton } from "@/src/role-models/components/CouncilButton"
import { RoleModelProfile } from "@/src/role-models/components/RoleModelProfile"

/**
 * One role model's profile, at its own address (D7): the back button works and
 * the link can be shared. Only validated people have a page; anyone else
 * answers 404, so a flagged person stays hidden until the owner marks him.
 */
export function generateStaticParams() {
  return shownPeople().map((p) => ({ id: p.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const person = shownPerson(id)
  return { title: person ? `${person.name} · Role models` : "Role models" }
}

export default async function RoleModelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const person = shownPerson(id)
  if (!person) notFound()
  return (
    <RoleModelProfile
      person={person}
      council={<CouncilButton id={person.id} name={person.name} values={valueWordsOf(person)} pronoun={person.pronoun} />}
    />
  )
}
