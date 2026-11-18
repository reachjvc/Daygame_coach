"use client"

export function QuestionsModule({ segs }: { segs: string[] }) {
  return <p className="px-4 text-sm text-zinc-500" data-testid="stub-questions">{segs.join("/")}</p>
}
