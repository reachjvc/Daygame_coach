"use client"

import { useEffect, useState } from "react"
import type { RoleModelPerson } from "@/src/role-models/types"

type Lookup = (id: string) => RoleModelPerson | null

/**
 * Finds a role model by id, once the bundled people have loaded. Loaded on
 * demand so a plan screen does not carry every profile to the phone
 * (tests/unit/role-models/clientBundle.test.ts). Null until then.
 */
export function usePersonLookup(): Lookup | null {
  const [lookup, setLookup] = useState<Lookup | null>(null)
  useEffect(() => {
    let live = true
    void import("@/src/role-models/catalog").then((m) => {
      if (live) setLookup(() => (id: string) => m.shownPerson(id))
    })
    return () => { live = false }
  }, [])
  return lookup
}
