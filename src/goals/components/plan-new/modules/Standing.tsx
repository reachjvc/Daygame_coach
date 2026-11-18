"use client"

export function StandingModule({ segs }: { segs: string[] }) {
  return <p className="px-4 text-sm text-zinc-500" data-testid="stub-standing">{segs.join("/")}</p>
}
