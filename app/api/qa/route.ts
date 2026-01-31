import { NextResponse } from "next/server"
import { requirePremium } from "@/src/db/server"
import { handleQARequest } from "@/src/qa"
import { qaRequestSchema } from "@/src/qa/schemas"

export async function POST(req: Request) {
  try {
    const auth = await requirePremium()
    if (!auth.success) return auth.response

    const body = await req.json()
    const parseResult = qaRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const response = await handleQARequest(parseResult.data, auth.userId)
    return NextResponse.json(response)
  } catch (error) {
    console.error("Q&A API Error:", error)
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
