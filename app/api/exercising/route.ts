import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { fetchExercisingData } from "@/src/exercising/exercisingService"

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    return NextResponse.json(await fetchExercisingData())
  } catch (e) {
    console.error("Exercising GET error:", e)
    const msg = e instanceof Error ? e.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
