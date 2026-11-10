// @vitest-environment jsdom
/**
 * LOG OUT WITH NO SIGNAL ENDS ON A "SIGNED OUT" SCREEN (alpha p10-deletes-03).
 *
 * iPhone, no signal: after "Log out anyway" the session was gone, but the move
 * to the front page cannot load offline, and Safari kept the audit page drawn
 * (his day, a greyed Log Out) with no word that he was signed out. Now the page
 * is covered by "Signed out on this phone" once the session has left.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { LogOutButton } from "@/components/LogOutButton"

const server = vi.hoisted(() => ({ signOut: vi.fn() }))
vi.mock("@/app/actions/auth", () => ({ signOut: server.signOut }))

const noSignal = () => Promise.reject(new TypeError("Failed to fetch"))
const wait = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)))

beforeEach(() => {
  server.signOut.mockReset()
  server.signOut.mockImplementation(noSignal)
  vi.useFakeTimers()
  vi.stubGlobal("caches", { keys: async () => [], delete: async () => true })
  vi.stubGlobal("fetch", vi.fn(noSignal))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("Log Out where the front page cannot load", () => {
  test("the page says he is signed out on this phone, over what was drawn, with a way to the front page", async () => {
    render(
      <>
        <p>His day: Walked to the station</p>
        <LogOutButton>
          {({ onClick, busy }) => (
            <button type="button" onClick={onClick} disabled={busy}>
              Log Out
            </button>
          )}
        </LogOutButton>
      </>,
    )
    fireEvent.click(screen.getByRole("button", { name: "Log Out" }))
    await wait(100)
    const signedOut = screen.getByTestId("log-out-signed-out")
    expect(signedOut.textContent).toContain("Signed out on this phone")
    expect(signedOut.className).toMatch(/fixed/)
    expect(signedOut.className).toMatch(/inset-0/)
    expect(signedOut.className).toMatch(/bg-background/)
    expect(screen.getByRole("button", { name: /front page/i })).toBeTruthy()
  })
})
