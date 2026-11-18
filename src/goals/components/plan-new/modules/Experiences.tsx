"use client"

export function ExperiencesModule({ segs }: { segs: string[] }) {
  return <p className="px-4 text-sm text-zinc-500" data-testid="stub-experiences">{segs.join("/")}</p>
}
