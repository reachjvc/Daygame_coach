"use client"

/**
 * The switcher. Quiet, always in the same place, and it says plainly that
 * nothing is lost by trying another — otherwise nobody touches it.
 */

import { SWITCHER, VICE_VERSIONS, type ViceVersionId } from "../data/versions"

export function VersionSwitcher({ version, onChange }: {
  version: ViceVersionId
  onChange: (v: ViceVersionId) => void
}) {
  return (
    <div className="mt-10 pt-5 border-t border-white/[0.07]">
      <div role="group" aria-label={SWITCHER.label} className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-zinc-600 mr-1">{SWITCHER.label}</span>
        {VICE_VERSIONS.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={version === v.id}
            title={v.forWho}
            onClick={() => onChange(v.id)}
            className={`text-[11.5px] px-2.5 py-1 rounded-full border transition-colors ${
              version === v.id
                ? "border-violet-400/50 bg-violet-500/15 text-violet-100"
                : "border-white/10 text-zinc-500 hover:border-white/30 hover:text-zinc-300"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-zinc-600 mt-1.5 leading-relaxed">{SWITCHER.note}</p>
    </div>
  )
}
