/**
 * THE CLOCK'S SECRET IS RE-READ, NOT KEPT FOREVER — src/notifications/clockAuth.ts.
 * A rotated secret must be taken up without a deploy; a missing one must not
 * cost a vault read per request.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const read = vi.fn<(name: string) => Promise<string | null>>()
vi.mock("@/src/db/notificationsRepo", () => ({ readNotificationSecret: (name: string) => read(name) }))

beforeEach(() => {
  vi.resetModules()
  read.mockReset()
})

describe("clockSecret", () => {
  it("keeps a secret five minutes, then reads the vault again", async () => {
    const { clockSecret } = await import("@/src/notifications/clockAuth")
    read.mockResolvedValueOnce("old").mockResolvedValueOnce("new")
    expect(await clockSecret(0)).toBe("old")
    expect(await clockSecret(4 * 60_000)).toBe("old")
    expect(await clockSecret(5 * 60_000 + 1)).toBe("new")
    expect(read).toHaveBeenCalledTimes(2)
  })

  it("keeps 'none stored' only a minute", async () => {
    const { clockSecret } = await import("@/src/notifications/clockAuth")
    read.mockResolvedValueOnce(null).mockResolvedValueOnce("set")
    expect(await clockSecret(0)).toBeNull()
    expect(await clockSecret(30_000)).toBeNull()
    expect(await clockSecret(61_000)).toBe("set")
    expect(read).toHaveBeenCalledTimes(2)
  })
})
