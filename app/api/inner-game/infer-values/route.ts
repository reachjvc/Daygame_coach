import { NextResponse } from "next/server"
import { requirePremium } from "@/src/db/server"
import { getUserValueIds } from "@/src/db/valuesRepo"
import { inferValues, ValueInferenceError } from "@/src/inner-game/modules/valueInference"
import { inferValuesSchema } from "@/src/inner-game/schemas"

export async function POST(req: Request) {
  try {
    const auth = await requirePremium()
    if (!auth.success) return auth.response

    const body = await req.json()
    const parseResult = inferValuesSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { context, response: userResponse } = parseResult.data
    const selectedValues = await getUserValueIds(auth.userId)
    const inferredValues = await inferValues(context, userResponse, selectedValues)

    return NextResponse.json({ values: inferredValues })
  } catch (error) {
    console.error("Inner Game infer-values POST error:", error)

    if (error instanceof ValueInferenceError) {
      const status = error.code === "MODEL_NOT_FOUND" ? 503 : error.code === "EMPTY_RESPONSE" ? 400 : 500
      return NextResponse.json({ error: error.message, code: error.code }, { status })
    }

    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
