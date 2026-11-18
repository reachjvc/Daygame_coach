"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { count } from "../count"

/** Sends the menu's `view` count once per visit to the page. */
export function ViewCount({ addiction }: { addiction: string }) {
  useEffect(() => {
    count(addiction, "menu", "view")
  }, [addiction])
  return null
}

interface SwitcherProps {
  current: string
  label: string
  options: { id: string; label: string }[]
  suffix: string
}

/** The addiction switcher: navigates when the choice changes. */
export function AddictionSwitcher({ current, label, options, suffix }: SwitcherProps) {
  const router = useRouter()
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={current}
        onChange={(e) => router.push(`/quit/${e.target.value}${suffix}`)}
        className="h-11 w-full rounded-md border border-border bg-card px-3 text-base text-foreground"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
