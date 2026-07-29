// @vitest-environment node
import { describe, it, expect } from "vitest"
import {
  buildTaxonomyItems,
  matchTaxonomy,
  splitSpans,
} from "@/src/goals/intakeService"
import { deriveIntents } from "@/src/goals/visionPlanService"

/**
 * M1 acceptance test with the REAL embedder — the same transformers.js model the
 * browser uses, run headlessly in node (pattern: memory intake-matcher-verification).
 *
 * Opt-in via RUN_EMBEDDER_TESTS=1: it downloads the model on first run (~100MB,
 * then cached) and takes ~30s, so it is excluded from the default deterministic
 * suite via test.skip-with-reason (never a silent return — see testing_behavior.md).
 *
 *   RUN_EMBEDDER_TESTS=1 npx vitest run tests/unit/goals/visionPlanService.embedder.test.ts
 */

const RUN = process.env.RUN_EMBEDDER_TESTS === "1"

const MODEL_ID = "Xenova/paraphrase-multilingual-MiniLM-L12-v2"

async function makeEmbedder() {
  const { pipeline } = await import("@huggingface/transformers")
  const extractor = await pipeline("feature-extraction", MODEL_ID)
  return async (texts: string[]): Promise<number[][]> => {
    const out = await extractor(texts, { pooling: "mean", normalize: true })
    return out.tolist() as number[][]
  }
}

describe("vision → intents with the real embedder (acceptance)", () => {
  it.skipIf(!RUN)(
    "the example vision yields ≥3 distinct pillar-tagged intents",
    async () => {
      // Arrange: embed taxonomy + the plan's canonical example vision
      const embed = await makeEmbedder()
      const items = buildTaxonomyItems()
      const itemVecs = await embed(items.map((i) => i.text))
      const vision =
        "I want to wake up and feel happy with my life, build a business, and be in love"

      // Act: the exact pipeline VisionPlanLab runs
      const spans = splitSpans(vision)
      const spanVecs = await embed(spans.map((s) => s.text))
      const spanMatches = spanVecs.map((v) => matchTaxonomy(v, items, itemVecs))
      const res = deriveIntents(spans, spanMatches)

      // Assert: at least 3 intents across at least 3 distinct life areas,
      // and the two concrete asks route to their obvious areas.
      expect(res.intents.length).toBeGreaterThanOrEqual(3)
      const pillars = new Set(res.intents.map((i) => i.pillarId))
      expect(pillars.size).toBeGreaterThanOrEqual(3)
      const byText = (needle: string) =>
        res.intents.find((i) => i.text.toLowerCase().includes(needle))
      expect(byText("business")?.pillarId).toBe("wealth")
      expect(byText("love")?.pillarId).toBe("relations")
    },
    180_000,
  )
})
