import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getLatestCommitment } from "@/src/tracking/trackingService"

export async function GET() {
  try {
    const auth = await requireAuth()
    if (!auth.success) return auth.response

    const commitment = await getLatestCommitment(auth.userId)

    return NextResponse.json({ commitment })
  } catch (error) {
    console.error("Error getting latest commitment:", error)
    return NextResponse.json(
      { error: "Failed to get commitment" },
      { status: 500 }
    )
  }
}
