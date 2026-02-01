import { NextResponse } from "next/server"
import { writeFile, mkdir, readdir } from "fs/promises"
import path from "path"
import type { ArticleFeedbackFlag } from "@/src/articles/types"

/**
 * Versioned article feedback API.
 *
 * File structure:
 * docs/articles/{articleId}/
 *   ├── draft1.md       - First draft
 *   ├── feedback1.md    - Feedback on draft1 (human-readable)
 *   ├── feedback1.json  - Feedback on draft1 (machine-readable)
 *   ├── draft2.md       - Second draft (after feedback1)
 *   ├── feedback2.md    - Feedback on draft2 (human-readable)
 *   └── feedback2.json  - Feedback on draft2 (machine-readable)
 *
 * The iterative workflow:
 * 1. User reviews draftN.md
 * 2. User marks sections with feedback types (excellent, good, almost, angle, ai, note)
 * 3. User clicks "Export" → saves feedbackN.md + feedbackN.json
 * 4. User clicks "Export & Draft New" → saves feedback, triggers AI to create draft(N+1).md
 *
 * Learnings are extracted via AI analysis in /api/test/analyze-comments and saved to
 * docs/articles/writing_style.md (global style guide).
 */

async function getLatestVersion(dirPath: string): Promise<number> {
  try {
    const files = await readdir(dirPath)
    const feedbackFiles = files.filter(f => f.match(/^feedback\d+\.md$/))
    if (feedbackFiles.length === 0) return 0

    const versions = feedbackFiles.map(f => {
      const match = f.match(/^feedback(\d+)\.md$/)
      return match ? parseInt(match[1], 10) : 0
    })
    return Math.max(...versions)
  } catch {
    return 0
  }
}

export async function POST(request: Request) {
  try {
    const { articleId, feedback, flags, type = "feedback" } = await request.json() as {
      articleId: string
      feedback: string
      flags?: ArticleFeedbackFlag[]
      type?: "feedback" | "draft"
    }

    const dirPath = path.join(process.cwd(), "docs/articles", articleId)

    // Ensure directory exists
    await mkdir(dirPath, { recursive: true })

    // Get current version
    const currentVersion = await getLatestVersion(dirPath)
    const newVersion = currentVersion + 1

    // Add header with version info
    const timestamp = new Date().toLocaleString("da-DK", {
      timeZone: "Europe/Copenhagen",
      dateStyle: "short",
      timeStyle: "short"
    })

    if (type === "draft") {
      // Save draft as markdown only
      const draftPath = path.join(dirPath, `draft${newVersion}.md`)
      const header = `<!-- Version: ${newVersion} | Created: ${timestamp} -->\n\n`
      await writeFile(draftPath, header + feedback, "utf-8")

      return NextResponse.json({
        success: true,
        path: draftPath,
        version: newVersion,
        type
      })
    }

    // Save feedback in both formats
    const mdPath = path.join(dirPath, `feedback${newVersion}.md`)
    const jsonPath = path.join(dirPath, `feedback${newVersion}.json`)

    // Save human-readable markdown
    const header = `<!-- Version: ${newVersion} | Created: ${timestamp} -->\n\n`
    await writeFile(mdPath, header + feedback, "utf-8")

    // Save machine-readable JSON (if flags provided)
    if (flags && flags.length > 0) {
      const jsonContent = {
        version: newVersion,
        articleId,
        createdAt: new Date().toISOString(),
        flags
      }
      await writeFile(jsonPath, JSON.stringify(jsonContent, null, 2), "utf-8")
    }

    // Learnings are now extracted via AI analysis in /api/test/analyze-comments
    // and saved to the global writing_style.md

    return NextResponse.json({
      success: true,
      mdPath,
      jsonPath: flags ? jsonPath : null,
      version: newVersion,
      type
    })
  } catch (error) {
    console.error("Failed to save:", error)
    return NextResponse.json(
      { error: "Failed to save" },
      { status: 500 }
    )
  }
}

/**
 * GET: Retrieve current version info for an article
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const articleId = searchParams.get("articleId")

    if (!articleId) {
      return NextResponse.json({ error: "articleId required" }, { status: 400 })
    }

    const dirPath = path.join(process.cwd(), "docs/articles", articleId)
    const currentVersion = await getLatestVersion(dirPath)

    // Check what files exist
    let files: string[] = []
    try {
      files = await readdir(dirPath)
    } catch {
      // Directory doesn't exist
    }

    const drafts = files.filter(f => f.match(/^draft\d+\.md$/)).sort()
    const feedbacks = files.filter(f => f.match(/^feedback\d+\.md$/)).sort()
    const hasLearnings = files.includes("learnings.md")

    return NextResponse.json({
      articleId,
      currentVersion,
      drafts,
      feedbacks,
      hasLearnings
    })
  } catch (error) {
    console.error("Failed to get version info:", error)
    return NextResponse.json(
      { error: "Failed to get version info" },
      { status: 500 }
    )
  }
}
