import Link from "next/link"
import { frame } from "@/src/quit/menu"

export default function QuitNotFound() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{frame.notFoundTitle}</h1>
      <p className="mt-1 text-muted-foreground">{frame.notFoundText}</p>
      <Link href="/quit" className="mt-4 flex min-h-11 items-center underline">
        {frame.notFoundLink}
      </Link>
    </div>
  )
}
