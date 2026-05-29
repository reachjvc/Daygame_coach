import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { initializeProgramme } from "@/src/exercising/exercisingService"

export async function POST() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const result = await initializeProgramme()
    return NextResponse.json({ message: "Programme initialized", ...result })
  } catch (e) {
    console.error("Exercising INIT error:", e)
    const msg = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
