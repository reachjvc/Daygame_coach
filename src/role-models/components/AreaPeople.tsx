"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import type { AreaPerson } from "../catalog"
import { roleModelHref } from "../routes"
import { RoleModelVisual } from "./RoleModelVisual"

/**
 * "People who lived this at a 10" in an area's dialog (Plans/role-models.md,
 * Phase 9). Stefan James: references are the legs of a belief, and the best
 * are people who started where you are, so each shows where he started. Read
 * after the dialog opens; draws nothing when the library has nobody for it.
 */
export function AreaPeople({ areaId, label }: { areaId: string; label: string }) {
  const [people, setPeople] = useState<AreaPerson[] | null>(null)
  useEffect(() => {
    let live = true
    fetch(`/api/role-models/area?id=${encodeURIComponent(areaId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { people: [] }))
      .then((b: { people: AreaPerson[] }) => live && setPeople(b.people ?? []))
      .catch(() => live && setPeople([]))
    return () => {
      live = false
    }
  }, [areaId])
  if (!people || people.length === 0) return null
  return (
    <div className="mt-4" data-testid="area-people">
      <p className="text-[12.5px] text-zinc-200">People who lived {label} at a 10</p>
      <ul className="mt-2 flex flex-col gap-2">
        {people.map((p) => (
          <li key={p.id} data-testid={`area-person-${p.id}`}>
            <Link href={roleModelHref(p.id)} className="flex gap-3 rounded-lg border border-white/10 p-2 hover:border-white/25">
              <RoleModelVisual name={p.name} years={p.years} color={p.color} size="small" />
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-zinc-100">
                  {p.name}
                  {p.inCouncil && <span className="ml-1.5 text-[10.5px] font-normal text-violet-300">in your council</span>}
                </span>
                <span className="block text-[11.5px] leading-relaxed text-zinc-400">Where he started: {p.startedFrom}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
