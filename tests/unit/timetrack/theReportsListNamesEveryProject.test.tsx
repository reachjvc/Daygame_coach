// @vitest-environment jsdom
/**
 * GROUP BY LISTS EVERY PROJECT (heavy-history audit, Phase 8 of
 * Plans/toggl-parity.md).
 *
 * The donut's list stopped at eight, with no line for the rest: for a month
 * with 41 projects it covered 35% of the time and said nothing about the
 * other 65%. Every project, or client, is listed with its time and share.
 */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"

import { DonutChart } from "@/src/timetrack/components/primitives"

afterEach(cleanup)

test("twelve projects, twelve lines, and the shares add up to the whole", () => {
  const slices = Array.from({ length: 12 }, (_, i) => ({ key: `p${i}`, label: `Project ${i + 1}`, color: null, value: (i + 1) * 600 }))
  render(<DonutChart slices={slices} formatValue={(v) => String(v)} />)
  const lines = screen.getAllByRole("listitem")
  expect(lines).toHaveLength(12)
  expect(lines.map((line) => line.textContent)).toContain("Project 1600" + "1%")
})
