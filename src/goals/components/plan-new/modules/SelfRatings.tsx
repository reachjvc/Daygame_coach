"use client"

export function SelfRatingsModule({ segs }: { segs: string[] }) {
  return <p className="px-4 text-sm text-zinc-500" data-testid="stub-selfratings">{segs.join("/")}</p>
}
