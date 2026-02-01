import { NextResponse } from "next/server"
import { readFile, writeFile } from "fs/promises"
import path from "path"
import type { ArticleManifest } from "@/src/articles/types"
import { lockContract, lockOutline, lockStructure } from "@/src/articles/articlesService"
import { PhaseTransitionRequestSchema } from "@/src/articles/schemas"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = PhaseTransitionRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { articleId, action, contract, outline } = parsed.data

    const manifestPath = path.join(process.cwd(), "docs/articles", articleId, "manifest.json")
    const manifest: ArticleManifest = JSON.parse(await readFile(manifestPath, "utf-8"))

    let result
    switch (action) {
      case "lock-contract":
        result = lockContract(manifest, contract!)
        break
      case "lock-outline":
        result = lockOutline(manifest, outline!)
        break
      case "lock-structure":
        result = lockStructure(manifest)
        break
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
    return NextResponse.json({ success: true, newPhase: result.newPhase })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
