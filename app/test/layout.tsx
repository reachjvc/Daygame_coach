import { notFound } from "next/navigation"

/**
 * Layout gate for /test/* pages.
 * Returns 404 in production — test pages are dev-only.
 */
export default function TestLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  return <>{children}</>
}
