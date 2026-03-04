import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"

const SCRIPTS_DIR = path.join(process.cwd(), "docs/conversation-scripts")

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const filePath = path.join(SCRIPTS_DIR, `${name}.json`)
    const raw = await readFile(filePath, "utf-8")
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
