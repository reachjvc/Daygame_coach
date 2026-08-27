"use client"

/**
 * THE ONLY WAY BACK IN THE APP.
 *
 * There were thirteen of these, each with its destination typed into the
 * component that drew it, so a screen sent you to the same place however you
 * arrived — and two of them said "Back to Dashboard" while pointing at
 * Tracking. This one prefers the address the link carried (`?from=`) and falls
 * back to the page's own home when there isn't one: a typed URL, a bookmark, a
 * link from outside.
 *
 * Not the browser's back button: installed to a home screen the app has no
 * browser chrome, so this is the only back that exists there.
 */

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { ROUTE_LABELS } from "@/components/navTabs"
import { RETURN_PARAM, readReturn } from "@/src/shared/returnTo"

interface BackLinkProps {
  /** Where to go when the link carried no return address. */
  fallback: string
  /** What to call that place. */
  fallbackLabel: string
  className?: string
}

/**
 * `useSearchParams` opts its whole tree into client rendering, and Next fails
 * the build for a page that reads it outside a Suspense boundary. Wrapped here
 * rather than at every call site: forgetting it would be a build error nobody
 * sees until deploy.
 */
export function BackLink(props: BackLinkProps) {
  return (
    <Suspense fallback={null}>
      <BackLinkInner {...props} />
    </Suspense>
  )
}

function BackLinkInner({ fallback, fallbackLabel, className = "" }: BackLinkProps) {
  const params = useSearchParams()
  const returned = readReturn(params?.get(RETURN_PARAM))
  const href = returned ?? fallback
  // A named destination is the difference between "somewhere" and "the page I
  // was on". The path alone is a name for the routes that have one.
  const label = returned ? ROUTE_LABELS[returned.split("?")[0]] ?? "Back" : fallbackLabel

  return (
    <Link
      href={href}
      data-testid="back-link"
      className={
        className ||
        "inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      }
    >
      <ArrowLeft className="size-4" />
      {label}
    </Link>
  )
}
