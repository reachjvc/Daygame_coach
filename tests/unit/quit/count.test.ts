// @vitest-environment node
import { describe, expect, it } from "vitest"
import { POST } from "@/app/api/quit/count/route"
import { parseCount } from "@/src/quit/countValidate"

const ok = { addiction: "nicotine", tool: "beliefs", step: "start" }

describe("parseCount", () => {
  it("accepts a whitelisted event, with or without src", () => {
    expect(parseCount(ok)).toEqual(ok)
    expect(parseCount({ ...ok, tool: "menu", step: "view", src: "ig-012" })?.src).toBe("ig-012")
  })

  it.each([
    ["unknown addiction", { ...ok, addiction: "tea" }],
    ["unknown tool", { ...ok, tool: "nope" }],
    ["unknown step", { ...ok, step: "click" }],
    ["src with capitals", { ...ok, src: "IG" }],
    ["src with a space", { ...ok, src: "a b" }],
    ["src over 20 chars", { ...ok, src: "a".repeat(21) }],
    ["empty src", { ...ok, src: "" }],
    ["src not a string", { ...ok, src: 5 }],
    ["not an object", "x"],
    ["null", null],
    ["an array", [ok]],
  ])("rejects %s", (_n, body) => {
    expect(parseCount(body)).toBeNull()
  })
})

const post = (body: string) =>
  POST(new Request("http://x/api/quit/count", { method: "POST", body, headers: { "content-type": "application/json" } }))

describe("POST /api/quit/count", () => {
  it("answers 204 with nothing for a valid event", async () => {
    const res = await post(JSON.stringify(ok))
    expect(res.status).toBe(204)
    expect(await res.text()).toBe("")
    expect(res.headers.get("set-cookie")).toBeNull()
  })
  it("answers 400 for a bad event and for broken JSON", async () => {
    expect((await post(JSON.stringify({ ...ok, step: "x" }))).status).toBe(400)
    expect((await post("{")).status).toBe(400)
  })
  it("answers 413 over 1 KB", async () => {
    expect((await post(JSON.stringify({ ...ok, pad: "a".repeat(1100) }))).status).toBe(413)
  })
})
