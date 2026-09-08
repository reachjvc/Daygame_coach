/**
 * A SECOND SETTINGS CLICK MUST NOT BE THROWN AWAY.
 *
 * Every one of the 25 controls on the settings page was wired to a single shared
 * `disabled={isPending}`. Saving any one preference therefore disabled all of
 * them -- across all four tabs, including the billing buttons -- until the round
 * trip finished. Measured in a real browser against the dev server, 2026-09-07:
 * the dead window was 1.9 seconds, and a click inside it hit a disabled control,
 * so it produced no state change, NO NETWORK REQUEST, and no error. It simply
 * vanished; the switch sat back where it started.
 *
 *     click "Bad Weather" off, wait 800ms, click "Hot Weather" off
 *       -> exactly ONE POST was sent
 *       -> database: bad weather off, hot weather still ON
 *
 * Same on the Game tab: difficulty saved, the voice-language click was dropped.
 *
 * The old e2e test clicked ONE toggle and asserted only that nothing threw
 * ("success = no error thrown"), so 4,485 passing tests said nothing about this.
 * These tests click a second control while the first save is still in flight,
 * which is the only way to see it.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { SettingsPage } from "@/src/settings/components/SettingsPage"
import { DEFAULT_SANDBOX_SETTINGS } from "@/src/scenarios/config"
import type { SandboxSettings } from "@/src/scenarios/config"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/dashboard/settings",
  useSearchParams: () => new URLSearchParams(),
}))

const profile = {
  id: "user-1",
  email: "test@example.com",
  full_name: null,
  has_purchased: true,
  created_at: new Date("2026-01-01").toISOString(),
  difficulty: "beginner",
  level: 1,
  xp: 0,
  scenarios_completed: 0,
  age_range_start: 22,
  age_range_end: 25,
  archetype: null,
  secondary_archetype: null,
  tertiary_archetype: null,
  dating_foreigners: null,
  user_is_foreign: null,
  preferred_region: null,
  secondary_region: null,
  experience_level: null,
  primary_goal: null,
  sandbox_settings: DEFAULT_SANDBOX_SETTINGS,
  voice_language: "en-US",
  timezone: "Europe/Copenhagen",
}

/** A save that stays in flight until the test releases it -- the 1.9s window. */
function deferred() {
  let release!: () => void
  const promise = new Promise<void>((resolve) => {
    release = resolve
  })
  return { promise, release }
}

function renderSettings(overrides: Partial<Parameters<typeof SettingsPage>[0]> = {}) {
  const props = {
    user: { id: "user-1", email: "test@example.com" },
    profile,
    subscription: null,
    stats: { totalScenarios: 0, averageScore: 0, level: 1, xp: 0, scenariosCompleted: 0 },
    onUpdateSandboxSettings: vi.fn(async (_s: Partial<SandboxSettings>) => {}),
    onResetSandboxSettings: vi.fn(async () => {}),
    onUpdateDifficulty: vi.fn(async () => {}),
    onUpdateVoiceLanguage: vi.fn(async () => {}),
    onUpdateTimezone: vi.fn(async () => {}),
    onCancelSubscription: vi.fn(async () => ({ success: true })),
    onReactivateSubscription: vi.fn(async () => ({ success: true })),
    onOpenBillingPortal: vi.fn(async () => null),
    ...overrides,
  }
  render(<SettingsPage {...props} />)
  return props
}

const user = () => userEvent.setup()

async function openTab(name: RegExp) {
  await user().click(screen.getByRole("tab", { name }))
}

afterEach(cleanup)

describe("settings toggles: a save must not freeze the page", () => {
  test("a second toggle clicked while the first is still saving is still sent", async () => {
    const inFlight = deferred()
    const onUpdateSandboxSettings = vi.fn(async (_s: Partial<SandboxSettings>) => {
      await inFlight.promise
    })
    renderSettings({ onUpdateSandboxSettings })

    await openTab(/sandbox/i)

    await user().click(screen.getByTestId("sandbox-toggle-enableBadWeather"))
    // First save is deliberately NOT resolved yet: this is the window in which
    // the old code disabled every control on the page.
    await user().click(screen.getByTestId("sandbox-toggle-enableHotWeather"))

    inFlight.release()

    await waitFor(() => {
      expect(onUpdateSandboxSettings).toHaveBeenCalledTimes(2)
    })
    expect(onUpdateSandboxSettings.mock.calls[0][0]).toEqual({
      weather: { enableBadWeather: false },
    })
    expect(onUpdateSandboxSettings.mock.calls[1][0]).toEqual({
      weather: { enableHotWeather: false },
    })
  })

  test("both switches stay where the user put them, not just the last one", async () => {
    // The screen used to disagree with the database: five toggles flipped, one
    // shown as flipped, all five actually saved. Reloading revealed the lie.
    const inFlight = deferred()
    renderSettings({
      onUpdateSandboxSettings: vi.fn(async () => {
        await inFlight.promise
      }),
    })

    await openTab(/sandbox/i)

    const bad = screen.getByTestId("sandbox-toggle-enableBadWeather")
    const hot = screen.getByTestId("sandbox-toggle-enableHotWeather")

    await user().click(bad)
    await user().click(hot)
    inFlight.release()

    await waitFor(() => {
      expect(bad).toHaveAttribute("aria-checked", "false")
      expect(hot).toHaveAttribute("aria-checked", "false")
    })
  })

  test("saving one preference leaves every other control clickable", async () => {
    const inFlight = deferred()
    renderSettings({
      onUpdateSandboxSettings: vi.fn(async () => {
        await inFlight.promise
      }),
    })

    await openTab(/sandbox/i)
    await user().click(screen.getByTestId("sandbox-toggle-enableBadWeather"))

    // Still saving. Nothing else on this tab may be dead.
    for (const id of [
      "enableHotWeather",
      "showWeatherDescriptions",
      "enableNegativeEnergies",
      "enableGymScenarios",
    ]) {
      expect(screen.getByTestId(`sandbox-toggle-${id}`)).toBeEnabled()
    }

    inFlight.release()
  })

  test("a sandbox save does not reach across tabs and freeze difficulty", async () => {
    // The single shared flag disabled controls the user could not even see.
    const inFlight = deferred()
    const onUpdateDifficulty = vi.fn(async () => {})
    renderSettings({
      onUpdateDifficulty,
      onUpdateSandboxSettings: vi.fn(async () => {
        await inFlight.promise
      }),
    })

    await openTab(/sandbox/i)
    await user().click(screen.getByTestId("sandbox-toggle-enableBadWeather"))

    await openTab(/game/i)
    await user().click(screen.getByRole("button", { name: /advanced/i }))

    inFlight.release()

    await waitFor(() => {
      expect(onUpdateDifficulty).toHaveBeenCalledWith("advanced")
    })
  })

  test("difficulty then voice language: both land, neither is swallowed", async () => {
    // Measured in the browser: difficulty saved as "advanced", the Danish click
    // was dropped and voice_language stayed en-US.
    const inFlight = deferred()
    const onUpdateDifficulty = vi.fn(async () => {
      await inFlight.promise
    })
    const onUpdateVoiceLanguage = vi.fn(async () => {})
    renderSettings({ onUpdateDifficulty, onUpdateVoiceLanguage })

    await openTab(/game/i)
    await user().click(screen.getByRole("button", { name: /advanced/i }))
    await user().click(screen.getByRole("button", { name: /danish/i }))

    inFlight.release()

    await waitFor(() => {
      expect(onUpdateDifficulty).toHaveBeenCalledWith("advanced")
      expect(onUpdateVoiceLanguage).toHaveBeenCalledWith("da-DK")
    })
  })

  test("the user is told a save is happening, since nothing greys out any more", async () => {
    const inFlight = deferred()
    renderSettings({
      onUpdateSandboxSettings: vi.fn(async () => {
        await inFlight.promise
      }),
    })

    await openTab(/sandbox/i)
    expect(screen.getByTestId("settings-save-status")).toHaveTextContent("")

    await user().click(screen.getByTestId("sandbox-toggle-enableBadWeather"))
    await waitFor(() => {
      expect(screen.getByTestId("settings-save-status")).toHaveTextContent(/saving/i)
    })

    inFlight.release()
    await waitFor(() => {
      expect(screen.getByTestId("settings-save-status")).toHaveTextContent("")
    })
  })
})

describe("settings toggles: what must still be protected", () => {
  test("the sandbox reset button is held while its own reset runs", async () => {
    // Not a preference: it overwrites every toggle at once, so double-firing it
    // is a real hazard. This one keeps its disable.
    const inFlight = deferred()
    renderSettings({
      onResetSandboxSettings: vi.fn(async () => {
        await inFlight.promise
      }),
    })

    await openTab(/sandbox/i)
    await user().click(screen.getByTestId("sandbox-reset-button"))
    await user().click(screen.getByRole("button", { name: /reset settings/i }))

    await waitFor(() => {
      expect(screen.getByTestId("sandbox-reset-button")).toBeDisabled()
    })

    inFlight.release()
    await waitFor(() => {
      expect(screen.getByTestId("sandbox-reset-button")).toBeEnabled()
    })
  })

  test("a toggle save does NOT hold the reset button hostage", async () => {
    const inFlight = deferred()
    renderSettings({
      onUpdateSandboxSettings: vi.fn(async () => {
        await inFlight.promise
      }),
    })

    await openTab(/sandbox/i)
    await user().click(screen.getByTestId("sandbox-toggle-enableBadWeather"))

    expect(screen.getByTestId("sandbox-reset-button")).toBeEnabled()
    inFlight.release()
  })
})

describe("the delta sent to the server", () => {
  test("only the changed key is sent, so concurrent saves cannot erase each other", async () => {
    // The server does read-merge-write. Sending the whole object from a stale
    // client snapshot is what would make two in-flight saves clobber one another.
    const onUpdateSandboxSettings = vi.fn(async (_s: Partial<SandboxSettings>) => {})
    renderSettings({ onUpdateSandboxSettings })

    await openTab(/sandbox/i)
    await user().click(screen.getByTestId("sandbox-toggle-enableShyEnergies"))

    await waitFor(() => expect(onUpdateSandboxSettings).toHaveBeenCalled())

    const payload = onUpdateSandboxSettings.mock.calls[0][0]
    expect(payload).toEqual({ energy: { enableShyEnergies: false } })
    expect(Object.keys(payload)).toHaveLength(1)
  })
})
