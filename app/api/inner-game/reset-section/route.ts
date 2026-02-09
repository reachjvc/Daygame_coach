import { NextResponse } from "next/server"
import { requirePremium } from "@/src/db/server"
import { resetUserSection, type SectionName } from "@/src/inner-game/modules/progress"
import { resetSectionSchema } from "@/src/inner-game/schemas"

export async function POST(req: Request) {
  try {
    const auth = await requirePremium()
    if (!auth.success) return auth.response

    const body = await req.json()
    const parseResult = resetSectionSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { section } = parseResult.data
    const progress = await resetUserSection(auth.userId, section as SectionName)

    return NextResponse.json({ progress })
  } catch (error) {
    console.error("Reset section error:", error)
    const message = error instanceof Error ? error.message : "Unexpected error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
