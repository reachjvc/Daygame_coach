"use client"

export function RoutinesModule({ segs }: { segs: string[] }) {
  return <p className="px-4 text-sm text-zinc-500" data-testid="stub-routines">{segs.join("/")}</p>
}
