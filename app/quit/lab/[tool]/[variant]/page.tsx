import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getAddiction } from "@/src/quit/data"
import { isFlag, isAddictionId } from "@/src/quit/menu"
import { isLabTool, LAB } from "@/src/quit/lab/registry"
import { LabFrame } from "@/src/quit/lab/LabFrame"

export const metadata = { robots: { index: false, follow: false } }

export default async function LabVariantPage({
  params,
  searchParams,
}: {
  params: Promise<{ tool: string; variant: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { tool, variant } = await params
  const sp = await searchParams
  if (!isFlag(sp.preview)) notFound()
  if (!isLabTool(tool)) notFound()
  const entry = LAB[tool]
  const v = Object.hasOwn(entry.variants, variant) ? entry.variants[variant] : undefined
  if (!v || !isAddictionId(v.addiction)) notFound()
  const data = getAddiction(v.addiction)
  if (!data) notFound()
  const { Component } = v
  return (
    <LabFrame tool={entry.name} variant={v.label}>
      <Suspense>
        <Component addiction={v.addiction} data={data} present={false} />
      </Suspense>
    </LabFrame>
  )
}
