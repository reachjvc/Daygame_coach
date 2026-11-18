"use client"

export function RoleModelsModule({ segs }: { segs: string[] }) {
  return <p className="px-4 text-sm text-zinc-500" data-testid="stub-rolemodels">{segs.join("/")}</p>
}
