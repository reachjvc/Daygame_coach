import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getDashboardLayout, saveDashboardLayout } from "@/src/tracking/dashboardService"
import { DashboardLayoutSchema } from "@/src/tracking/schemas"

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  try {
    return NextResponse.json(await getDashboardLayout(auth.userId, "tracking"))
  } catch (error) {
    console.error("Error loading dashboard layout:", error)
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const parsed = DashboardLayoutSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid layout" }, { status: 400 })
  }

  try {
    return NextResponse.json(await saveDashboardLayout(auth.userId, parsed.data.widgets, "tracking"))
  } catch (error) {
    // validateWidgets rejects bad layouts with a message worth showing.
    const message = error instanceof Error ? error.message : "Failed to save dashboard"
    console.error("Error saving dashboard layout:", error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
