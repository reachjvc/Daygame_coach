import { describe, it, expect } from "vitest"
import { screenVideo, shouldIngest, QA_THRESHOLDS, VideoSignals } from "../../../scripts/training-data/lib/ingestQaScreen"

/** A clean, high-quality video — baseline that screens PASS. Override per case. */
function clean(overrides: Partial<VideoSignals> = {}): VideoSignals {
  return {
    videoId: "test00000_x",
    chunkCount: 30,
    segments: 200,
    highTierRatio: 0.99,
    lqRatio: 0.1,
    videoType: "talking_head",
    dominantChunkType: "talking_head",
    vtConfidence: 0.97,
    ...overrides,
  }
}

describe("screenVideo", () => {
  it("passes a clean video", () => {
    const v = screenVideo(clean())
    expect(v.severity).toBe("PASS")
    expect(v.reasons).toHaveLength(0)
    expect(v.advisories).toHaveLength(0)
  })

  it("BLOCKs a thin video (<= minChunks chunks)", () => {
    const v = screenVideo(clean({ chunkCount: QA_THRESHOLDS.minChunks }))
    expect(v.severity).toBe("BLOCK")
    expect(v.reasons.join(" ")).toMatch(/thin/)
  })

  it("BLOCKs a short + damaged video that escaped the size-gated lq check", () => {
    // 11 segs, 90.9% high — the real 6fHFpEjahnc case
    const v = screenVideo(clean({ segments: 11, highTierRatio: 0.909, lqRatio: 0.64, chunkCount: 3 }))
    expect(v.severity).toBe("BLOCK")
  })

  it("does NOT block a short but clean video", () => {
    // 40 segs but fully repaired to 100% high (xfVhG9qwB38 case) — ADVISORY at most, never BLOCK
    const v = screenVideo(clean({ segments: 40, highTierRatio: 1.0, lqRatio: 0.35, chunkCount: 11 }))
    expect(v.severity).not.toBe("BLOCK")
    expect(v.severity).not.toBe("REVIEW")
  })

  it("REVIEWs a type-uncertain video (low video_type confidence)", () => {
    const v = screenVideo(clean({ vtConfidence: 0.7 }))
    expect(v.severity).toBe("REVIEW")
    expect(v.reasons.join(" ")).toMatch(/type-uncertain/)
  })

  it("REVIEWs a final-product type mismatch", () => {
    const v = screenVideo(clean({ videoType: "infield", dominantChunkType: "talking_head" }))
    expect(v.severity).toBe("REVIEW")
    expect(v.reasons.join(" ")).toMatch(/type-mismatch/)
  })

  it("REVIEWs low post-repair confidence (< 95% high tier)", () => {
    const v = screenVideo(clean({ segments: 273, highTierRatio: 0.923 }))
    expect(v.severity).toBe("REVIEW")
    expect(v.reasons.join(" ")).toMatch(/low-confidence/)
  })

  it("REVIEWs an unverifiable video (missing 06h signals) — fail-closed", () => {
    const v = screenVideo(clean({ segments: null, highTierRatio: null }))
    expect(v.severity).toBe("REVIEW")
    expect(v.reasons.join(" ")).toMatch(/unverifiable/)
  })

  it("ADVISORY for heavy-repair reliance (still ingestible)", () => {
    const v = screenVideo(clean({ lqRatio: 0.4 }))
    expect(v.severity).toBe("ADVISORY")
    expect(v.advisories.join(" ")).toMatch(/heavy-repair/)
  })

  it("ADVISORY for compilation", () => {
    const v = screenVideo(clean({ videoType: "compilation", dominantChunkType: "compilation" }))
    expect(v.severity).toBe("ADVISORY")
    expect(v.advisories.join(" ")).toMatch(/compilation/)
  })

  it("escalates to the worst severity (BLOCK beats REVIEW beats ADVISORY)", () => {
    const v = screenVideo(clean({ chunkCount: 2, highTierRatio: 0.5, segments: 10, lqRatio: 0.9, vtConfidence: 0.5 }))
    expect(v.severity).toBe("BLOCK")
  })
})

describe("shouldIngest", () => {
  const mk = (severity: any) => ({ videoId: "x", severity, reasons: [], advisories: [] })
  it("never ingests BLOCK", () => {
    expect(shouldIngest(mk("BLOCK"), false)).toBe(false)
    expect(shouldIngest(mk("BLOCK"), true)).toBe(false)
  })
  it("ingests REVIEW only with override", () => {
    expect(shouldIngest(mk("REVIEW"), false)).toBe(false)
    expect(shouldIngest(mk("REVIEW"), true)).toBe(true)
  })
  it("always ingests PASS and ADVISORY", () => {
    expect(shouldIngest(mk("PASS"), false)).toBe(true)
    expect(shouldIngest(mk("ADVISORY"), false)).toBe(true)
  })
})
