import { NextResponse } from "next/server"
import { requirePremium } from "@/src/db/server"
import { handleQARequest } from "@/src/qa"
import { qaRequestSchema } from "@/src/qa/schemas"
import { buildGroundedSystemPrompt } from "@/src/qa/prompt"
import { TEST_RETRIEVAL_BACKEND } from "@/src/qa/testBackend"

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

    const response = await handleQARequest(parseResult.data, auth.userId, {
      backend: TEST_RETRIEVAL_BACKEND,
      buildSystemPrompt: buildGroundedSystemPrompt,
      hideAttribution: true,
      adaptive: {}, // use DEFAULT_ADAPTIVE knobs
      model: "llama3.1", // 8B grounds far more reliably than the 3B default
    })
    return NextResponse.json(response)
  } catch (error) {
    console.error("Q&A Test API Error:", error)
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
