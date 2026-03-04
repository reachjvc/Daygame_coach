import { NextResponse } from "next/server"
import { readdir, readFile, writeFile, mkdir } from "fs/promises"
import path from "path"
import type { ConversationScript } from "@/src/scenarios/types"

const SCRIPTS_DIR = path.join(process.cwd(), "docs/conversation-scripts")

export async function GET() {
  try {
    await mkdir(SCRIPTS_DIR, { recursive: true })
    const files = await readdir(SCRIPTS_DIR)
    const jsons = files.filter(f => f.endsWith(".json"))

    const list = await Promise.all(
      jsons.map(async (f) => {
        const raw = await readFile(path.join(SCRIPTS_DIR, f), "utf-8")
        const script: ConversationScript = JSON.parse(raw)
        return { id: script.id, name: script.name, updatedAt: script.updatedAt }
      })
    )
    return NextResponse.json(list)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const script: ConversationScript = await request.json()
    await mkdir(SCRIPTS_DIR, { recursive: true })
    const filename = script.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "") + ".json"
    const filePath = path.join(SCRIPTS_DIR, filename)
    await writeFile(filePath, JSON.stringify(script, null, 2), "utf-8")
    return NextResponse.json({ success: true, path: filePath })
  } catch (error) {
    console.error("Failed to save script:", error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 })
  }
}
