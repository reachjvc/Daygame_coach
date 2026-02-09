import { NextResponse } from "next/server"
import { readdir } from "fs/promises"
import { join } from "path"

const DIAGNOSTICS_DIR = join(process.cwd(), "data/woman-responses/diagnostics")

export async function GET() {
  try {
    const files = await readdir(DIAGNOSTICS_DIR)
    const jsonFiles = files.filter((f) => f.endsWith(".json"))
    return NextResponse.json({ files: jsonFiles })
  } catch {
    // Directory doesn't exist yet - that's fine
    return NextResponse.json({ files: [] })
  }
}
