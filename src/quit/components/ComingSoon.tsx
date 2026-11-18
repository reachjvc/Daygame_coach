import Link from "next/link"
import { frame, menu, previewSuffix } from "../menu"
import type { QuitAddictionId } from "../types"

interface ComingSoonProps {
  addiction: QuitAddictionId
  name: string
  line: string
  wave: 1 | 2 | 3
  preview: boolean
}

/** Shown for a tool that has no screen yet: its name, its line and when. */
export function ComingSoon({ addiction, name, line, wave, preview }: ComingSoonProps) {
  const when = wave === 1 ? frame.comingSoon : menu.coming[String(wave) as "2" | "3"]
  return (
    <div data-testid="coming-soon" className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-lg font-semibold">{name}</h2>
      <p className="mt-1 text-muted-foreground">{line}</p>
      <p className="mt-3 font-medium text-primary">{when}</p>
      <Link href={`/quit/${addiction}${previewSuffix(preview)}`} className="mt-4 flex min-h-11 items-center underline">
        {frame.backToMenu}
      </Link>
    </div>
  )
}
