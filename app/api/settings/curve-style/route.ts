import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getCurveStyle } from "@/src/db/settingsRepo"
import { handleUpdateCurveStyle } from "@/src/settings/settingsService"

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const curveStyle = await getCurveStyle(auth.userId)
    return NextResponse.json({ curve_style: curveStyle })
  } catch (error) {
    console.error("Error getting curve style:", error)
    return NextResponse.json({ error: "Failed to get curve style" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const { curve_style } = body

    if (curve_style !== undefined) {
      await handleUpdateCurveStyle(auth.userId, curve_style)
    }

    const updated = await getCurveStyle(auth.userId)
    return NextResponse.json({ curve_style: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
