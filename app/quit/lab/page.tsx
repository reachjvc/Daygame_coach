import Link from "next/link"
import { notFound } from "next/navigation"
import { isFlag } from "@/src/quit/menu"
import { LAB, LAB_TOOL_IDS } from "@/src/quit/lab/registry"
import { labText } from "@/src/quit/lab/text"

export const metadata = { robots: { index: false, follow: false } }

export default async function LabIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  if (!isFlag(sp.preview)) notFound()
  return (
    <div className="pb-8">
      <h1 className="mt-2 text-2xl font-semibold leading-tight">{labText.indexTitle}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{labText.indexLine}</p>
      <ul className="mt-4 flex flex-col gap-4">
        {LAB_TOOL_IDS.map((id) => {
          const entry = LAB[id]
          const variants = Object.entries(entry.variants)
          return (
            <li key={id} data-testid={`lab-tool-${id}`} className="rounded-md border border-border bg-card p-3">
              <h2 className="text-base font-semibold">{entry.name}</h2>
              {variants.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">{labText.notBuilt}</p>
              ) : (
                <ul className="mt-1 flex flex-col">
                  {variants.map(([vid, v]) => (
                    <li key={vid}>
                      <Link
                        href={`/quit/lab/${id}/${vid}?preview=1`}
                        data-testid={`lab-link-${id}-${vid}`}
                        className="flex min-h-11 items-center text-sm text-primary underline"
                      >
                        {v.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
