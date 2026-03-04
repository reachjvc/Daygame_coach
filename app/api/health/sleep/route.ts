import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { createSleepLog, getSleepLogs, deleteSleepLog } from "@/src/db/healthRepo"
import type { SleepLogInsert } from "@/src/health/types"
import { z } from "zod"

const CreateSchema = z.object({
  bedtime: z.string(),
  wake_time: z.string(),
  quality: z.number().int().min(1).max(5).optional(),
  logged_at: z.string().optional(),
})

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
    return NextResponse.json(await createSleepLog(auth.userId, parsed.data as SleepLogInsert), { status: 201 })
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
