import { describe, expect, it } from "vitest"
import { isLabTool, LAB, LAB_TOOL_IDS } from "@/src/quit/lab/registry"
import { createLabStore, LAB_STORE_KEY } from "@/src/quit/lab/store"

describe("lab registry", () => {
  it("has every tool id with a name", () => {
    expect(Object.keys(LAB).sort()).toEqual([...LAB_TOOL_IDS].sort())
    expect(LAB_TOOL_IDS).toHaveLength(13)
    for (const id of LAB_TOOL_IDS) {
      expect(isLabTool(id)).toBe(true)
      expect(LAB[id].name.length).toBeGreaterThan(0)
    }
    expect(isLabTool("nope")).toBe(false)
  })

  it("gives every variant a component, label, addiction and kind", () => {
    for (const id of LAB_TOOL_IDS) {
      for (const v of Object.values(LAB[id].variants)) {
        expect(typeof v.Component).toBe("function")
        expect(v.label.length).toBeGreaterThan(0)
        expect(v.addiction.length).toBeGreaterThan(0)
        expect(["copy", "best", "current"]).toContain(v.kind)
      }
    }
  })
})

describe("lab store", () => {
  it("namespaces values and survives a throwing storage", () => {
    const data: Record<string, string> = {}
    const store = createLabStore(() => ({
      getItem: (k) => data[k] ?? null,
      setItem: (k, v) => {
        data[k] = v
      },
    }))
    store.set("sos", "a", "probe", "x")
    expect(store.get("sos", "a", "probe")).toBe("x")
    expect(JSON.parse(data[LAB_STORE_KEY])).toEqual({ "sos/a/probe": "x" })

    const broken = createLabStore(() => ({
      getItem: () => {
        throw new Error("blocked")
      },
      setItem: () => {
        throw new Error("blocked")
      },
    }))
    broken.set("a", "b", "c", 1)
    expect(broken.get("a", "b", "c")).toBe(1)
  })
})
