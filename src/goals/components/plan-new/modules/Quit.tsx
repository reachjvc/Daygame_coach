"use client"

export function QuitModule({ segs }: { segs: string[] }) {
  return <p className="px-4 text-sm text-zinc-500" data-testid="stub-quit">{segs.join("/")}</p>
}
