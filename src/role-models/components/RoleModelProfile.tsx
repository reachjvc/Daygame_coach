import type { ReactNode } from "react"

import { BackLink } from "@/components/BackLink"
import { ROUTES } from "@/src/shared/routes"

import { cardOf, possessiveOf, valueWordsOf } from "../catalog"
import type { RoleModelPerson, RoleModelSource } from "../types"
import { RoleModelVisual } from "./RoleModelVisual"

/**
 * A person's full profile (Plans/role-models.md, Phase 5). Every value shows
 * "how we know", one line per piece of evidence with its source, so a reader
 * can check the claim. The shadow is part of the profile, never hidden.
 */
export function RoleModelProfile({ person, council }: { person: RoleModelPerson; council?: ReactNode }) {
  const card = cardOf(person)
  const words = valueWordsOf(person)
  const his = possessiveOf(person)
  const sourceById = new Map(person.sources.map((s) => [s.id, s]))
  const cite = (id: string, locator?: string) => <SourceRef source={sourceById.get(id)} locator={locator} />

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8" data-testid="role-model-profile">
      <BackLink fallback={ROUTES.roleModels} fallbackLabel="All role models" />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <RoleModelVisual name={person.name} years={card.years} color={card.color} size="profile" />
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{card.categoryLabel}</p>
          <h1 className="text-3xl font-semibold text-foreground">{person.name}</h1>
          <p className="text-sm text-muted-foreground">{card.years}</p>
          <p className="text-base text-foreground/90">{person.tagline}</p>
        </div>
      </header>

      {council}

      <Section title={`What ${his.subject} stood for`} testId="profile-values">
        <ul className="flex flex-col gap-4">
          {person.values.map((v, i) => (
            <li key={v.word}>
              <h3 className="font-semibold text-foreground">{words[i]}</h3>
              <p className="text-xs text-muted-foreground">How we know</p>
              <ul className="mt-1 flex flex-col gap-1 text-sm text-foreground/85">
                {v.evidence.map((e, j) => (
                  <li key={j}>
                    <span className="text-muted-foreground">{evidenceLabel(e.kind, his.subject)}: </span>
                    {e.claim} {cite(e.sourceId, e.locator)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`In ${his.lower} words`} testId="profile-quotes">
        <ul className="flex flex-col gap-3">
          {person.quotes.map((q, i) => (
            <li key={i}>
              <blockquote className="border-l-2 border-border pl-3 text-base italic text-foreground">“{q.text}”</blockquote>
              <p className="mt-1 pl-3 text-xs text-muted-foreground">
                {cite(q.sourceId, q.locator)}
                {q.translation ? ` · translated by ${q.translation}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`${his.title} principles`} testId="profile-principles">
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-foreground/90">
          {person.principles.map((p, i) => (
            <li key={i}>
              {p.text} {cite(p.sourceId, p.locator)}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="The moment that shows it" testId="profile-moment">
        <Prose text={person.definingMoment.text} />
        <Refs ids={person.definingMoment.sourceIds} cite={cite} />
      </Section>

      <Section title={`Where ${his.subject} started`} testId="profile-started">
        <Prose text={person.startedFrom} />
      </Section>

      <Section title={`${his.title} shadow`} testId="profile-shadow">
        <Prose text={person.shadow.text} />
        <Refs ids={person.shadow.sourceIds} cite={cite} />
      </Section>

      {person.readings.length > 0 && (
        <Section title={`What to read by ${person.pronoun === "she" ? "her" : "him"}`} testId="profile-readings">
          <ul className="flex flex-col gap-1 text-sm text-foreground/90">
            {person.readings.map((r) => (
              <li key={r.title}>
                <span className="italic">{r.title}</span> ({String(r.year)})
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Sources" testId="profile-sources">
        <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
          {person.sources.map((s) => (
            <li key={s.id}>
              {s.author}, {s.url ? <a href={s.url} className="underline" rel="noopener noreferrer" target="_blank">{s.title}</a> : <span className="italic">{s.title}</span>}
              {s.publisher ? `, ${s.publisher}` : ""}, {String(s.year)}
              {s.kind === "primary" ? ` (${his.lower} own words)` : ""}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">Checked {person.review.checkedOn}.</p>
      </Section>
    </article>
  )
}



function evidenceLabel(kind: "deed" | "words" | "witness", subject: string): string {
  if (kind === "deed") return `What ${subject} did`
  if (kind === "words") return `What ${subject} said`
  return "What others wrote"
}

function Section({ title, testId, children }: { title: string; testId: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2" data-testid={testId}>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

function Prose({ text }: { text: string }) {
  return <p className="text-sm leading-relaxed text-foreground/90">{text}</p>
}

function Refs({ ids, cite }: { ids: string[]; cite: (id: string) => ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground">
      Sources:{" "}
      {ids.map((id, i) => (
        <span key={id}>
          {i > 0 ? "; " : ""}
          {cite(id)}
        </span>
      ))}
    </p>
  )
}

function SourceRef({ source, locator }: { source: RoleModelSource | undefined; locator?: string }) {
  if (!source) return null
  // Short in the text: who, and the exact place. The full title is in Sources below.
  const who = source.author.split(/,| translated by /)[0].trim()
  const label = `${who}${locator ? `, ${locator}` : `, ${source.title}`}`
  return (
    <span className="text-xs text-muted-foreground">
      (
      {source.url ? (
        <a href={source.url} title={source.title} className="underline" rel="noopener noreferrer" target="_blank">
          {label}
        </a>
      ) : (
        label
      )}
      )
    </span>
  )
}
