import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { isLive } from "@/src/quit/data"
import { frame, isFlag, menu, previewSuffix, viewableIds } from "@/src/quit/menu"
import { QUIT_ADDICTION_IDS } from "@/src/quit/types"

export const metadata = { title: "Quit something" }

export default async function QuitHome({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const preview = isFlag((await searchParams).preview)
  const open = viewableIds(preview)
  const later = QUIT_ADDICTION_IDS.filter((id) => !open.includes(id))
  const q = previewSuffix(preview)
  return (
    <div className="pb-8">
      <h1 className="text-2xl font-semibold leading-tight">{frame.pickTitle}</h1>
      <p className="mt-1 text-muted-foreground">{frame.pickLine}</p>
      <ul className="mt-5 flex flex-col gap-2">
        {open.map((id) => (
          <li key={id}>
            <Link
              href={`/quit/${id}${q}`}
              className="flex min-h-14 items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-lg font-medium"
            >
              <span>
                {menu.addictions[id].title}
                {!isLive(id) && <span className="ml-2 text-xs font-normal text-muted-foreground">{frame.preview}</span>}
              </span>
              <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      {later.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{frame.comingLater}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {later.map((id) => (
              <li key={id} className="rounded-lg border border-border px-4 py-3 text-muted-foreground">
                {menu.addictions[id].title}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-8 border-t border-border pt-2 text-sm">
        <Link href="/privacy" className="flex min-h-11 items-center">
          {frame.privacy}
        </Link>
      </p>
    </div>
  )
}
