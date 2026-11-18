"use client"

import { useEffect, useState } from "react"

/** Current time in ms, refreshed every `ms`. Call it only after mount (the setup gate guarantees that). */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}
