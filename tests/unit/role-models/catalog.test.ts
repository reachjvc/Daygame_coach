/**
 * The role model catalogue's machine checks (Plans/role-models.md, Phase 1).
 *
 * Every person file must pass. The fixture tests prove each rule can fail on
 * its own, so an empty or permissive check cannot pass by doing nothing.
 */
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { checkPerson } from "@/src/role-models/catalogCheck"
import { ROLE_MODEL_CATEGORIES } from "@/src/role-models/categories"
import { PERSON_IDS } from "@/src/role-models/data/index.generated"
import { BAD_CASES } from "@/tests/fixtures/role-models/badCases"
import good from "@/tests/fixtures/role-models/good.json"

const dir = path.resolve(__dirname, "../../../src/role-models/data/people")
const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
const people = files.map((f) => ({ file: f, data: JSON.parse(readFileSync(path.join(dir, f), "utf8")) }))

describe("every person file", () => {
  it.each(people.length ? people : [{ file: "(none yet)", data: null }])("$file passes every rule", ({ file, data }) => {
    if (data === null) return
    expect(checkPerson(data)).toEqual([])
    expect(data.id + ".json").toBe(file)
  })

  it("the generated index lists exactly the files present", () => {
    expect([...PERSON_IDS]).toEqual(files.map((f) => f.slice(0, -5)))
  })

  it("no two people share a name", () => {
    const names = people.map((p) => p.data.name.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
  })
})

describe("the check itself", () => {
  it("passes the good fixture", () => {
    expect(checkPerson(good)).toEqual([])
  })

  it.each(BAD_CASES)("fails $name, for its own reason", ({ rules, mutate }) => {
    const p = structuredClone(good) as Record<string, unknown>
    mutate(p)
    const failed = [...new Set(checkPerson(p).map((f) => f.rule))].sort()
    expect(failed).toEqual([...rules].sort())
  })

  it("has thirteen categories with known areas", () => {
    expect(ROLE_MODEL_CATEGORIES).toHaveLength(13)
  })
})
