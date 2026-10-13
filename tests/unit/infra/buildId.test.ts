// @vitest-environment node
/**
 * EVERY BUILD IS NAMED BY ITS FULL COMMIT SHA, OR IT DOES NOT BUILD.
 *
 * `infra/deploy.sh` decides whether a deploy worked by comparing
 * `/api/healthz`'s `buildId` with the image's revision label. If the build ID
 * could quietly become "unknown" or a short SHA, that comparison would fail on
 * every deploy and roll back a good image, or, worse, be loosened until it
 * proves nothing. So each source is checked here, and so is the refusal.
 */

import { describe, it, expect } from "vitest"
import { buildId } from "../../../scripts/build-id.mjs"

const A = "a".repeat(40)
const B = "b".repeat(40)
const C = "c".repeat(40)
const noGit = () => undefined

describe("buildId", () => {
  it("prefers BUILD_SHA, which Docker and CI set", () => {
    expect(buildId({ BUILD_SHA: A, VERCEL_GIT_COMMIT_SHA: B }, () => C)).toBe(A)
  })

  it("uses Vercel's commit when BUILD_SHA is absent", () => {
    expect(buildId({ VERCEL_GIT_COMMIT_SHA: B }, () => C)).toBe(B)
  })

  it("asks git last, and trims its newline", () => {
    expect(buildId({}, () => `${C}\n`)).toBe(C)
  })

  it("fails the build when nothing answers, and names BUILD_SHA", () => {
    expect(() => buildId({}, noGit)).toThrow(/BUILD_SHA is not set/)
  })

  it("refuses a short SHA instead of falling through to the next source", () => {
    expect(() => buildId({ BUILD_SHA: "abc1234" }, () => C)).toThrow(
      /BUILD_SHA is "abc1234", which is not a full 40-character commit SHA/,
    )
  })

  it("treats an empty variable as absent", () => {
    expect(buildId({ BUILD_SHA: "", VERCEL_GIT_COMMIT_SHA: " " }, () => C)).toBe(C)
  })
})
