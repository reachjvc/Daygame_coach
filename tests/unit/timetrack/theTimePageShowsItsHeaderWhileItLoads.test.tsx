// @vitest-environment jsdom
/**
 * TAPPING TIME SHOWS THE TRACKER'S HEADER AT ONCE, NOT A BLANK PAGE.
 *
 * `/time` asks the auth server who you are before it renders, and with no
 * `loading.tsx` in its folder nothing at all was drawn until that answer came
 * back (getting-around #6 in Plans/time-tracker-like-toggl.md). The loading
 * file draws the same header the tracker draws while its own data loads, so
 * nothing jumps when the page arrives.
 */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"

import TimeLoading from "@/app/(app)/time/loading"
import { ROUTES } from "@/src/shared/routes"

afterEach(() => cleanup())

test("the loading screen has the tracker's header, its way back and a word about what is coming", () => {
  render(<TimeLoading />)
  expect(screen.getByRole("heading", { name: "Time Log" })).toBeTruthy()
  const back = screen.getByRole("link", { name: /Home/ }) // the Dashboard, named Home since 2026-11-10
  expect(back.getAttribute("href")).toBe(ROUTES.dashboard)
  expect(screen.getByText("Loading your time…")).toBeTruthy()
})
