"use client"

export function ObstaclesModule({ segs }: { segs: string[] }) {
  return <p className="px-4 text-sm text-zinc-500" data-testid="stub-obstacles">{segs.join("/")}</p>
}
