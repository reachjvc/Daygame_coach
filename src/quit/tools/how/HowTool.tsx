"use client"

import { useEffect } from "react"
import { count } from "../../count"
import { NumberCard } from "../../components/NumberCard"
import { SourcesFold } from "../../components/kit"
import { SourceTap } from "../../components/kit"
import { tooltext as t } from "../../tooltext"
import type { QuitNumber, QuitRef, ToolProps } from "../../types"
import { realRefs, uniqueRefs, usable } from "../common"
import { NotReady } from "../NotReady"
import { groupNumbers } from "./logic"

/** How people quit: a read page of checked numbers. */
export function HowTool({ addiction, data }: ToolProps) {
  const numbers = usable<QuitNumber[]>(data.numbers)
  const hope = usable<QuitNumber>(data.hope)
  const note = data.footerNote && typeof data.footerNote === "object" ? data.footerNote : null
  useEffect(() => {
    count(addiction, "how", "start")
    count(addiction, "how", "done")
  }, [addiction])

  if (!numbers || numbers.length === 0) return <NotReady />
  const groups = groupNumbers(numbers, hope)
  const noteRefs: QuitRef[] = note ? realRefs(note.refs) : []
  const all = uniqueRefs([
    ...(hope ? [hope.ref, ...(hope.alsoRef ?? [])] : []),
    ...numbers.flatMap((n) => [n.ref, ...(n.alsoRef ?? [])]),
    ...noteRefs,
  ])
  return (
    <>
      <div data-testid="how" className="flex flex-col gap-6">
        {hope && <NumberCard n={hope} big />}
        {groups.map((g) => (
          <section key={g.group} data-testid={`group-${g.group}`}>
            {g.group !== "hope" && <h2 className="text-lg font-semibold">{t.how.groups[g.group]}</h2>}
            <div className={g.group === "hope" ? "flex flex-col gap-4" : "mt-2 flex flex-col gap-4"}>
              {g.items.map((n, i) => (
                <NumberCard key={`${n.kind}-${i}`} n={n} />
              ))}
            </div>
          </section>
        ))}
        {note && (
          <div data-testid="footer-note">
            <p className="text-sm text-muted-foreground">{note.text}</p>
            <SourceTap refs={noteRefs} />
          </div>
        )}
      </div>
      <SourcesFold refs={all} />
    </>
  )
}
