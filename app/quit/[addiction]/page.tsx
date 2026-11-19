import Link from "next/link"
import { notFound } from "next/navigation"
import { AddictionSwitcher, ViewCount } from "@/src/quit/components/MenuClient"
import {
  frame,
  isFlag,
  isLiveTool,
  isViewable,
  menu,
  minutesText,
  previewSuffix,
  withPreview,
  toolName,
  viewableIds,
} from "@/src/quit/menu"

export async function generateMetadata({ params, searchParams }: { params: Promise<{ addiction: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { addiction } = await params
  if (!isViewable(addiction, isFlag((await searchParams).preview))) return {}
  return { title: menu.addictions[addiction].title }
}

export default async function QuitMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ addiction: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { addiction } = await params
  const preview = isFlag((await searchParams).preview)
  if (!isViewable(addiction, preview)) notFound()
  const q = previewSuffix(preview)
  const options = viewableIds(preview).map((id) => ({ id, label: menu.addictions[id].switcher }))

  return (
    <div>
      <ViewCount addiction={addiction} />
      <h1 className="text-2xl font-semibold leading-tight">{menu.addictions[addiction].title}</h1>
      <div className="mt-3">
        <AddictionSwitcher current={addiction} label={frame.switcherLabel} options={options} suffix={q} />
      </div>
      {isLiveTool(menu.newHere.tool) && (
        <p className="mt-4">
          <Link href={`/quit/${addiction}/${menu.newHere.tool}${q}`} className="flex min-h-11 items-center text-primary underline">
            {menu.newHere.text}
          </Link>
        </p>
      )}

      {menu.groups.map((group) => (
        <section key={group.id} className="mt-6" aria-labelledby={`g-${group.id}`}>
          <h2 id={`g-${group.id}`} className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {group.name}
          </h2>
          <ul className="mt-2 flex flex-col gap-2">
            {group.tools.map((tool) => {
              const minutes = minutesText(tool.minutes)
              const done = isLiveTool(tool.id)
              const href = withPreview(tool.href ?? `/quit/${addiction}/${tool.id}`, preview)
              const body = (
                <>
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-medium">{toolName(tool, addiction)}</span>
                    {!done ? (
                      <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                        {frame.soon}
                      </span>
                    ) : (
                      tool.account !== "none" && (
                        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                          {menu.accountPills[tool.account]}
                        </span>
                      )
                    )}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{tool.line}</span>
                  {minutes && <span className="mt-1 block text-xs text-muted-foreground">{minutes}</span>}
                </>
              )
              return (
                <li key={tool.id}>
                  {done ? (
                    <Link href={href} data-testid={`row-${tool.id}`} className="block min-h-14 rounded-lg border border-border bg-card px-4 py-3">
                      {body}
                    </Link>
                  ) : (
                    <div
                      data-testid={`row-${tool.id}`}
                      data-soon="true"
                      aria-disabled="true"
                      className="block min-h-14 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 opacity-60"
                    >
                      {body}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      {isLiveTool("sos") && (
        <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <Link
            href={`/quit/${addiction}/sos${q}`}
            data-testid="sos-bar"
            className="flex min-h-12 items-center justify-center rounded-lg bg-primary px-4 text-base font-semibold text-primary-foreground"
          >
            {menu.sosBar}
          </Link>
        </div>
      )}
    </div>
  )
}
