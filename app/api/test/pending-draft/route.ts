import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import type { ArticleFeedbackFlag, ArticleSection } from "@/src/articles/types"

interface PendingDraftRequest {
  articleId: string
  title: string
  sections: ArticleSection[]
  feedback: ArticleFeedbackFlag[]
}

/**
 * POST: Save a pending draft request for Claude Code to process.
 *
 * Instead of calling the AI API (which costs credits), this saves all the
 * context needed to generate a new draft to a JSON file that Claude Code
 * can read and process directly in VS Code.
 */
export async function POST(request: Request) {
  try {
    const data: PendingDraftRequest = await request.json()

    if (!data.articleId || !data.title || !data.sections) {
      return NextResponse.json(
        { error: "articleId, title, and sections are required" },
        { status: 400 }
      )
    }

    const dirPath = path.join(process.cwd(), "docs/articles", data.articleId)
    await mkdir(dirPath, { recursive: true })

    const pendingPath = path.join(dirPath, "pending-draft.json")

    const pendingData = {
      ...data,
      createdAt: new Date().toISOString(),
      instruction: "Process with Claude Code: 'process the pending article draft'"
    }

    await writeFile(pendingPath, JSON.stringify(pendingData, null, 2), "utf-8")

    return NextResponse.json({
      success: true,
      path: pendingPath,
      message: "Pending draft saved. Ask Claude Code to process it."
    })
  } catch (error) {
    console.error("Failed to save pending draft:", error)
    return NextResponse.json(
      { error: "Failed to save pending draft" },
      { status: 500 }
    )
  }
}
