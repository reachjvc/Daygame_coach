import { afterEach, describe, expect, it, vi } from "vitest"
import {
  finishedToolIds,
  findMenuTool,
  frame,
  isLiveTool,
  isViewable,
  liveToolIds,
  menu,
  minutesText,
  previewAllowed,
  toolName,
  toolReachable,
  viewableIds,
} from "@/src/quit/menu"
import { QUIT_TOOL_IDS } from "@/src/quit/types"

afterEach(() => vi.unstubAllEnvs())

describe("menu text", () => {
  it("lists every tool id exactly once, in 5 groups", () => {
    const ids = menu.groups.flatMap((g) => g.tools.map((t) => t.id))
    expect(menu.groups).toHaveLength(5)
    expect([...ids].sort()).toEqual([...QUIT_TOOL_IDS].sort())
  })
  it("has no No-account pill, Start-here box or men/man in names", () => {
    const text = JSON.stringify(menu) + JSON.stringify(frame)
    expect(text).not.toMatch(/no account|start here/i)
    expect(text).not.toMatch(/\bmen?\b/i)
  })
  it("fills {lies} and formats minutes", () => {
    const beliefs = menu.groups[0].tools[0]
    expect(toolName(beliefs, "nicotine")).toBe("The 12 lies nicotine tells you")
    expect(minutesText(3)).toBe("3 min")
    expect(minutesText("30 s")).toBe("30 s")
    expect(minutesText(null)).toBeNull()
  })
})

describe("who can be viewed", () => {
  it("in development every addiction with a data file is a preview", () => {
    vi.stubEnv("NODE_ENV", "development")
    expect(isViewable("nicotine", false)).toBe(true)
    expect(isViewable("gambling", false)).toBe(false)
    expect(isViewable("nope", false)).toBe(false)
  })
  it("in production only nicotine (live.json) is viewable without ?preview=1; other addictions need it", () => {
    vi.stubEnv("NODE_ENV", "production")
    expect(viewableIds(false)).toEqual(["nicotine"])
    expect(isViewable("nicotine", false)).toBe(true)
    expect(isViewable("weed", false)).toBe(false)
    expect(isViewable("weed", true)).toBe(true)
  })
  it("in production a tool page opens without ?preview=1 only when liveTools.json lists it", () => {
    vi.stubEnv("NODE_ENV", "production")
    expect(liveToolIds()).toEqual(["date", "sos"])
    expect(toolReachable("date", false)).toBe(true)
    expect(toolReachable("sos", false)).toBe(true)
    expect(toolReachable("cost", false)).toBe(false)
    expect(toolReachable("cost", true)).toBe(true)
    expect(previewAllowed(false)).toBe(false)
  })
  it("every live tool is a real menu tool, and finished tools are live", () => {
    for (const id of liveToolIds()) expect(findMenuTool(id), id).not.toBeNull()
    for (const id of finishedToolIds()) expect(isLiveTool(id), id).toBe(true)
  })
})
