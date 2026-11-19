"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { facetFor } from "@/src/shared/facets"

/**
 * Every page wears its part's colour (Plans/rebrand-10kdaysclub.md, Phase 3).
 *
 * Mounted once, in the root layout, so no page can be missed: signed-in pages,
 * pages that hide the frame (`/plan`, `/time`, `/training/live`), the quit
 * tools and the public pages alike. The wrapper is `display: contents`, so it
 * draws no box and changes no layout; custom properties still inherit through it.
 *
 * Dialogs and sheets are portalled to `<body>`, outside this wrapper, so the
 * same value also goes on `<html>` once the page runs. Before then nothing is
 * portalled, so the server-drawn wrapper is enough for the first paint.
 */
export function FacetScope({ children }: { children: ReactNode }) {
  const facet = facetFor(usePathname() ?? "/")
  useEffect(() => {
    document.documentElement.dataset.facet = facet
  }, [facet])
  return (
    <div data-facet={facet} className="contents">
      {children}
    </div>
  )
}
