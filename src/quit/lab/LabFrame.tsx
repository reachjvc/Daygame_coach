import { BackLink } from "@/components/BackLink"
import { labText } from "./text"

/** Slim top bar for one variant: back to the lab index, tool name, variant label. */
export function LabFrame({ tool, variant, children }: { tool: string; variant: string; children: React.ReactNode }) {
  return (
    <div className="pb-8">
      <header className="mb-4 flex min-w-0 items-center gap-2 border-b border-border pb-2">
        <BackLink
          fallback="/quit/lab?preview=1"
          fallbackLabel={labText.back}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        />
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold" data-testid="lab-tool-name">
          {tool}
        </h1>
        <span className="max-w-[45%] shrink-0 truncate rounded-full border border-border bg-card px-2.5 py-0.5 text-xs text-muted-foreground" data-testid="lab-variant-label">
          {variant}
        </span>
      </header>
      <div>{children}</div>
    </div>
  )
}
