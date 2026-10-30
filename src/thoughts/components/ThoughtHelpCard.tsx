"use client"

/**
 * WHERE TO FIND HELP, when a thought being typed is about self-harm (Q14).
 *
 * The numbers are the Black Box's (`src/vice/data/help.ts`, `SERVICES`): one
 * list of crisis services in the app, checked once, so a number corrected
 * there is corrected here. Only its crisis entries are shown — the Black Box's
 * own help door is about addiction, and its other sections would be the wrong
 * conversation here. The country is asked before any number is shown, and
 * remembered in this browser only, exactly as the Black Box does it.
 *
 * Nothing is blocked, nothing is sent anywhere, and the thought is still
 * logged if the person logs it.
 */

import { LifeBuoy } from "lucide-react"
import { HELP, SERVICES } from "@/src/vice/data/help"
import { useHelpLocale } from "@/src/vice/blackbox/useHelpLocale"
import type { HelpLocale } from "@/src/vice/types"
import { cn } from "@/lib/utils"

const LOCALES: HelpLocale[] = ["uk", "us", "other"]

export function ThoughtHelpCard({ onDismiss }: { onDismiss: () => void }) {
  const { locale, remember } = useHelpLocale()
  const region = locale ? SERVICES[locale] : null
  const crisis = (region?.items ?? []).filter((s) => s.crisis && !s.forVice)

  return (
    <section
      aria-label="Where to find help"
      data-testid="thought-help-card"
      className="rounded-2xl border border-rose-400/35 bg-rose-500/[0.08] p-4 text-sm"
    >
      <p className="flex items-center gap-2 font-semibold text-rose-100">
        <LifeBuoy className="size-4" aria-hidden />
        {HELP.crisisHeading}
      </p>
      <p className="mt-1 leading-relaxed text-rose-100/80">{HELP.crisisBlurb}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-rose-100/70">{HELP.localeQuestion}</span>
        {LOCALES.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={locale === id}
            onClick={() => remember(id)}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-3.5 text-xs transition-colors",
              locale === id ? "border-rose-300/60 bg-rose-400/20 text-rose-50" : "border-rose-200/20 text-rose-100/80",
            )}
          >
            {SERVICES[id].label}
          </button>
        ))}
      </div>

      {region && (
        <div className="mt-3 space-y-2 text-rose-50">
          <p>
            Emergency: <span className="font-semibold tabular-nums">{region.emergency}</span>
          </p>
          <ul className="space-y-2">
            {crisis.map((s) => (
              <li key={s.name}>
                <p>
                  {s.name} — <span className="font-semibold tabular-nums">{s.contact}</span>
                </p>
                <p className="text-xs leading-relaxed text-rose-100/70">{s.note}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button type="button" onClick={onDismiss} className="mt-3 min-h-11 text-xs text-rose-100/70 underline underline-offset-4">
        Hide this
      </button>
    </section>
  )
}
