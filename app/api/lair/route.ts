import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getUserLairConfig, saveUserLairConfig } from "@/src/db/lairRepo"
import { validateLayout } from "@/src/lair/lairService"
import type { UserLairLayout } from "@/src/db/lairTypes"

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const layout = await getUserLairConfig(auth.userId)
    return NextResponse.json(layout)
  } catch (error) {
    console.error("Error getting lair config:", error)
    return NextResponse.json({ error: "Failed to get lair config" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const layout: UserLairLayout = await request.json()
    const validationError = validateLayout(layout)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
    await saveUserLairConfig(auth.userId, layout)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving lair config:", error)
    return NextResponse.json({ error: "Failed to save lair config" }, { status: 500 })
  }
}
