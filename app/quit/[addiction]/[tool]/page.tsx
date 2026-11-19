import { Suspense } from "react"
import { notFound } from "next/navigation"
import { ComingSoon } from "@/src/quit/components/ComingSoon"
import { ToolFrame } from "@/src/quit/components/ToolFrame"
import { getAddiction } from "@/src/quit/data"
import { findMenuTool, isFlag, isViewable, menu, toolName, toolReachable } from "@/src/quit/menu"
import { TOOL_REGISTRY } from "@/src/quit/tools/registry"
import { QUIT_TOOL_IDS, type QuitToolId } from "@/src/quit/types"

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ addiction: string; tool: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { addiction, tool } = await params
  const menuTool = findMenuTool(tool)
  const pv = isFlag((await searchParams).preview)
  if (!isViewable(addiction, pv) || !menuTool || !toolReachable(tool, pv)) return {}
  return { title: { absolute: `${toolName(menuTool, addiction)} · ${menu.addictions[addiction].title}` } }
}

export default async function QuitToolPage({
  params,
  searchParams,
}: {
  params: Promise<{ addiction: string; tool: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { addiction, tool } = await params
  const sp = await searchParams
  const preview = isFlag(sp.preview)
  const present = isFlag(sp.present)
  if (!isViewable(addiction, preview)) notFound()
  if (!(QUIT_TOOL_IDS as readonly string[]).includes(tool)) notFound()
  if (!toolReachable(tool, preview)) notFound()
  const entry = TOOL_REGISTRY[tool as QuitToolId]
  const menuTool = findMenuTool(tool)
  const data = getAddiction(addiction)
  if (!menuTool || !data) notFound()
  const name = toolName(menuTool, addiction)

  if (entry.Component === null || entry.wave > 1) {
    return (
      <ToolFrame addiction={addiction} title={menu.addictions[addiction].title} present={present} preview={preview} hideCraving={tool === "sos"}>
        <ComingSoon addiction={addiction} name={name} line={menuTool.line} wave={entry.wave} preview={preview} />
      </ToolFrame>
    )
  }
  const { Component } = entry
  return (
    <ToolFrame addiction={addiction} title={name} present={present} preview={preview} hideCraving={tool === "sos"}>
      <Suspense>
        <Component addiction={addiction} data={data} present={present} />
      </Suspense>
    </ToolFrame>
  )
}
