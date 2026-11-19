"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { withPreview } from "../menu"

type Props = Omit<React.ComponentProps<typeof Link>, "href"> & { href: string }

function Inner({ href, ...rest }: Props) {
  const preview = useSearchParams().get("preview") === "1"
  return <Link href={withPreview(href, preview)} {...rest} />
}

/** A link inside the quit pages that keeps `?preview=1` when the current address has it. */
export function PreviewLink(props: Props) {
  return (
    <Suspense fallback={<Link {...props} />}>
      <Inner {...props} />
    </Suspense>
  )
}
