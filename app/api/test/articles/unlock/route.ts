import { NextResponse } from "next/server"
import { readFile, writeFile } from "fs/promises"
import path from "path"
import type { ArticleManifest } from "@/src/articles/types"
import { unlockStructure } from "@/src/articles/articlesService"
import { UnlockStructureRequestSchema } from "@/src/articles/schemas"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = UnlockStructureRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { articleId, reason } = parsed.data

    const manifestPath = path.join(process.cwd(), "docs/articles", articleId, "manifest.json")
    const manifest: ArticleManifest = JSON.parse(await readFile(manifestPath, "utf-8"))

    const result = unlockStructure(manifest, reason)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
    return NextResponse.json({ success: true, newPhase: result.newPhase })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
