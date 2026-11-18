import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { frame, previewSuffix } from "../menu"
import type { QuitAddictionId } from "../types"

interface ToolFrameProps {
  addiction: QuitAddictionId
  title: string
  /** Current step and the number of steps; both set shows the progress bar. */
  step?: number
  of?: number
  /** `?present=1`: no footer, type scaled 1.4x. */
  present?: boolean
  preview?: boolean
  /** Hides the footer's "Craving now?" (the `sos` tool itself). */
  hideCraving?: boolean
  children: React.ReactNode
}

/** Header, back, progress and footer shared by every quit tool. */
export function ToolFrame({ addiction, title, step, of, present = false, preview = false, hideCraving = false, children }: ToolFrameProps) {
  const q = previewSuffix(preview)
  const showBar = step !== undefined && of !== undefined && of > 0
  return (
    <div data-present={present ? "true" : undefined} style={present ? { zoom: 1.4 } : undefined} className="pb-8">
      <header className="mb-4">
        <Link
          href={`/quit/${addiction}${q}`}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {frame.back}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">{title}</h1>
        {showBar && (
          <div
            role="progressbar"
            aria-label={frame.progress}
            aria-valuemin={0}
            aria-valuemax={of}
            aria-valuenow={step}
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          >
            <div className="h-full bg-primary" style={{ width: `${Math.min(100, (step / of) * 100)}%` }} />
          </div>
        )}
      </header>
      <div>{children}</div>
      {!present && (
        <footer className="mt-10 border-t border-border pt-4 text-sm">
          <ul className="flex flex-col">
            {!hideCraving && (
              <li>
                <Link href={`/quit/${addiction}/sos${q}`} className="flex min-h-11 items-center font-medium text-primary">
                  {frame.cravingNow}
                </Link>
              </li>
            )}
            <li>
              <Link href={`/quit/${addiction}${q}`} className="flex min-h-11 items-center">
                {frame.freeTools}
              </Link>
            </li>
            <li>
              <Link href="/quit/coaching" className="flex min-h-11 items-center">
                {frame.coaching}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="flex min-h-11 items-center">
                {frame.privacy}
              </Link>
            </li>
            <li className="hidden [body:has(#sources)_&]:block">
              <a href="#sources" className="flex min-h-11 items-center">
                {frame.sources}
              </a>
            </li>
          </ul>
        </footer>
      )}
    </div>
  )
}
