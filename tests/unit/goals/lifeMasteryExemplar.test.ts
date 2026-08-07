import { describe, it, expect } from "vitest"
import {
  EXEMPLAR_AREAS, EXEMPLAR_GOALS, EXEMPLAR_WHOLE_LIFE, EXEMPLAR_HIT_RATE,
  EXEMPLAR_ERA_LABEL, exemplarArea, exemplarGoals,
} from "@/src/goals/data/lifeMasteryExemplar"
import { LIFE_MASTERY_AREAS } from "@/src/goals/data/lifeMasteryAreas"
import { LIFE_MASTERY_CORPUS } from "@/src/goals/data/lifeMasteryCorpus"

/** Normalise like the corpus verifier does, so we compare wording not punctuation. */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()

/** Every transcript's banked text, joined per videoId. */
const byVideo = new Map<string, string>()
for (const e of LIFE_MASTERY_CORPUS) {
  byVideo.set(e.videoId, (byVideo.get(e.videoId) ?? "") + " " + norm(e.text))
}

/** A quote is "grounded" when most of its distinctive 5-grams appear in the
 * banked text for the videoId it claims. Same doctrine as merge-corpus.py. */
const grounded = (quote: string, videoId: string) => {
  const hay = byVideo.get(videoId)
  if (!hay) return false
  const w = norm(quote).split(" ")
  if (w.length < 6) return hay.includes(norm(quote))
  const grams = []
  for (let i = 0; i + 4 < w.length; i += 5) grams.push(w.slice(i, i + 5).join(" "))
  return grams.filter((g) => hay.includes(g)).length / grams.length >= 0.6
}

describe("the worked exemplar is his plan, not our paraphrase", () => {
  it("covers all 12 canonical areas exactly once", () => {
    expect(EXEMPLAR_AREAS).toHaveLength(LIFE_MASTERY_AREAS.length)
    expect(new Set(EXEMPLAR_AREAS.map((a) => a.areaId)).size).toBe(EXEMPLAR_AREAS.length)
    for (const a of LIFE_MASTERY_AREAS) expect(exemplarArea(a.id), a.id).toBeDefined()
  })

  it("every area has at least one vision quote", () => {
    for (const a of EXEMPLAR_AREAS) expect(a.vision.length, a.areaId).toBeGreaterThan(0)
  })

  it("EVERY quote is grounded in the verified corpus under its own videoId", () => {
    const ungrounded: string[] = []
    for (const a of EXEMPLAR_AREAS) {
      for (const v of a.vision) if (!grounded(v.quote, v.videoId)) ungrounded.push(`${a.areaId} vision/${v.videoId}`)
      if (a.purpose && !grounded(a.purpose.quote, a.purpose.videoId)) ungrounded.push(`${a.areaId} purpose/${a.purpose.videoId}`)
      if (a.identity && !grounded(a.identity.quote, a.identity.videoId)) ungrounded.push(`${a.areaId} identity/${a.identity.videoId}`)
    }
    for (const [k, v] of Object.entries(EXEMPLAR_WHOLE_LIFE)) {
      if (!grounded(v.quote, v.videoId)) ungrounded.push(`whole-life ${k}/${v.videoId}`)
    }
    if (!grounded(EXEMPLAR_HIT_RATE.quote, EXEMPLAR_HIT_RATE.videoId)) ungrounded.push("hit-rate")
    expect(ungrounded, `ungrounded quotes must be fixed or removed:\n${ungrounded.join("\n")}`).toEqual([])
  })

  it("anything carrying a number carries an era — his numbers drift across years", () => {
    const eras = new Set(Object.keys(EXEMPLAR_ERA_LABEL))
    for (const a of EXEMPLAR_AREAS) {
      for (const v of a.vision) {
        expect(eras.has(v.era), `${a.areaId}: bad era ${v.era}`).toBe(true)
        // the fitness/money drift is the reason this rule exists
        if (/\d/.test(v.quote)) expect(v.era, `${a.areaId} numeric quote needs an era`).toBeTruthy()
      }
    }
  })

  it("the fitness area keeps BOTH eras rather than silently picking one", () => {
    const fit = exemplarArea("lm_fitness")!
    expect(fit.vision.length).toBeGreaterThanOrEqual(2)
    expect(new Set(fit.vision.map((v) => v.era)).size).toBeGreaterThanOrEqual(2)
    expect(fit.vision.some((v) => v.quote.includes("190"))).toBe(true)
    expect(fit.vision.some((v) => v.quote.includes("170"))).toBe(true)
  })

  it("the area he never wrote a vision for is marked reconstructed, not passed off as his", () => {
    const mind = exemplarArea("lm_mindset")!
    expect(mind.reconstructed).toBe(true)
    expect(mind.gloss).toMatch(/reconstruct|honest gap/i)
    // and a reconstruction must never be presented without explanation
    for (const a of EXEMPLAR_AREAS) if (a.reconstructed) expect(a.gloss, a.areaId).toBeTruthy()
  })

  it("keeps the misses — the 80-90%% hit rate is the lesson", () => {
    const verdicts = EXEMPLAR_GOALS.map((g) => g.verdict)
    expect(verdicts).toContain("missed")
    expect(verdicts).toContain("chosen-not-to")
    expect(verdicts.filter((v) => v === "missed").length).toBeGreaterThanOrEqual(2)
    expect(EXEMPLAR_HIT_RATE.quote).toMatch(/90/)
  })

  it("his goal sentences keep his own format", () => {
    const easily = EXEMPLAR_GOALS.filter((g) => /I'?ll easily|I will easily/i.test(g.sentence))
    expect(easily.length).toBeGreaterThanOrEqual(4)
  })

  it("goals attach to real areas and are findable per area", () => {
    const ids = new Set(LIFE_MASTERY_AREAS.map((a) => a.id))
    for (const g of EXEMPLAR_GOALS) expect(ids.has(g.areaId), g.areaId).toBe(true)
    expect(exemplarGoals("lm_money").length).toBeGreaterThanOrEqual(2)
    expect(exemplarGoals("lm_spirituality")).toEqual([])
  })
})
