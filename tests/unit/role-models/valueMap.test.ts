import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { INNER_GAME_TO_LIFE_PLAN } from "@/src/role-models/data/valueMap"
import { canonicalValueWord, ROLE_MODEL_VALUE_WORDS } from "@/src/role-models/valueWords"

const config = readFileSync(path.resolve(__dirname, "../../../src/inner-game/config.ts"), "utf8")
const innerGameWords = [...config.matchAll(/values: \[([\s\S]*?)\]/g)].flatMap((m) =>
  [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]),
)

describe("the agents' word list file", () => {
  it("matches the life plan list exactly", () => {
    const file = readFileSync(path.resolve(__dirname, "../../../scripts/role-models/prompts/value-words.txt"), "utf8")
    const words = file.trim().split("\n").flatMap((line) => line.slice(line.indexOf(":") + 1).split(",").map((w) => w.trim()))
    expect(words).toEqual([...ROLE_MODEL_VALUE_WORDS])
  })
})

describe("inner game to life plan word map", () => {
  it("maps every inner game word, and only those", () => {
    expect(innerGameWords.length).toBe(301)
    expect(Object.keys(INNER_GAME_TO_LIFE_PLAN).sort()).toEqual([...innerGameWords].sort())
  })

  it("points only at life plan words, in their own spelling", () => {
    for (const [from, { to, why }] of Object.entries(INNER_GAME_TO_LIFE_PLAN)) {
      if (to === null) expect(why, from).toBeTruthy()
      else expect(canonicalValueWord(to), from).toBe(to)
    }
  })

  it("maps a word on both lists to itself", () => {
    for (const w of ROLE_MODEL_VALUE_WORDS) {
      const hit = Object.entries(INNER_GAME_TO_LIFE_PLAN).find(([k]) => k.toLowerCase() === w.toLowerCase())
      if (hit) expect(hit[1].to).toBe(w)
    }
  })
})
