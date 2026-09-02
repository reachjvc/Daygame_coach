import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { createSleepLog, getSleepLogs, deleteSleepLog } from "@/src/db/healthRepo"
import type { SleepLogInsert } from "@/src/health/types"
import { z } from "zod"
import { entryWhenFields, hasDateIfTime, NEEDS_DATE_FOR_TIME } from "@/src/health/schemas"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { loggedAtForEntry } from "@/src/health/healthService"

const CreateSchema = z.object({
  bedtime: z.string(),
  wake_time: z.string(),
  quality: z.number().int().min(1).max(5).optional(),
  ...entryWhenFields,
}).refine(hasDateIfTime, NEEDS_DATE_FOR_TIME)

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const days = Number(new URL(request.url).searchParams.get("days") ?? 30)
    return NextResponse.json(await getSleepLogs(auth.userId, days))
  } catch (e) { console.error("Error getting sleep logs:", e); return err("Failed to get sleep logs") }
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const parsed = CreateSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 })
    const { entry_date, entry_time, ...log } = parsed.data
    const loggedAt = entry_date
      ? loggedAtForEntry(entry_date, await getUserTimezone(auth.userId), entry_time)
      : undefined
    if (loggedAt === null) return err("That is in the future", 400)

    const insert = { ...log, ...(loggedAt ? { logged_at: loggedAt } : {}) } as SleepLogInsert
    return NextResponse.json(await createSleepLog(auth.userId, insert), { status: 201 })
  } catch (e) { console.error("Error creating sleep log:", e); return err("Failed to create sleep log") }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const id = new URL(request.url).searchParams.get("id")
    if (!id) return err("Missing id", 400)
    await deleteSleepLog(auth.userId, id)
    return NextResponse.json({ success: true })
  } catch (e) { console.error("Error deleting sleep log:", e); return err("Failed to delete sleep log") }
}
