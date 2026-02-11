import { NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"

const DIAGNOSTICS_DIR = join(process.cwd(), "data/woman-responses/diagnostics")

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const file = searchParams.get("file")

  if (!file) {
    return NextResponse.json({ error: "Missing file parameter" }, { status: 400 })
  }

  // Security: prevent path traversal
  if (file.includes("..") || file.includes("/")) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 })
  }

  try {
    const filePath = join(DIAGNOSTICS_DIR, file)
    const content = await readFile(filePath, "utf-8")
    const data = JSON.parse(content)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 })
  }
}
