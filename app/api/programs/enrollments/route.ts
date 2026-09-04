import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { listActiveEnrollments, listPastEnrollments, enrollInProgram } from "@/src/db/programRepo"
import { CustomScheduleSchema } from "@/src/programs/schemas"
import { z } from "zod"

const EnrollSchema = z.object({
  programId: z.string().min(1),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  unitSystem: z.enum(["kg", "lb"]),
  oneRepMaxes: z.record(z.string(), z.number().positive()).optional(),
  workingWeights: z.record(z.string(), z.number().positive()).optional(),
  customSchedule: CustomScheduleSchema.nullish(),
})

const err = (msg: string, s = 500) => NextResponse.json({ error: msg }, { status: s })

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    // `?past=1` returns the archive. The default shape stays a plain array of
    // ACTIVE enrollments, because three callers already read it that way.
    const past = new URL(request.url).searchParams.get("past") === "1"
    const list = past ? listPastEnrollments : listActiveEnrollments
    return NextResponse.json(await list(auth.userId))
  } catch (e) { console.error("list enrollments:", e); return err("Failed to list enrollments") }
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  try {
    const parsed = EnrollSchema.safeParse(await request.json())
    if (!parsed.success) return err("Validation failed", 400)
    return NextResponse.json(await enrollInProgram(auth.userId, parsed.data), { status: 201 })
  } catch (e) { console.error("enroll:", e); return err((e as Error).message) }
}
