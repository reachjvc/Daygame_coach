"use client"

export function IdentityModule({ segs }: { segs: string[] }) {
  return <p className="px-4 text-sm text-zinc-500" data-testid="stub-identity">{segs.join("/")}</p>
}
