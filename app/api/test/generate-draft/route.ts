import { NextResponse } from "next/server"
import { readFile, writeFile, mkdir, readdir } from "fs/promises"
import path from "path"
import { generateRevisedDraft } from "@/src/articles/articlesService"
import { createServerSupabaseClient } from "@/src/db/server"
import type { ArticleFeedbackFlag, ArticleSection } from "@/src/articles/types"

// Only these emails can use AI-powered endpoints
const ALLOWED_AI_EMAILS = ["reachjvc@gmail.com"]

/**
 * POST: Generate a new draft based on feedback.
 *
 * Takes the current draft sections and feedback, calls AI to generate
 * a revised draft, and saves it as draft(N+1).md
 *
 * DEVELOPMENT ONLY - blocked in production to prevent API cost abuse.
 */
export async function POST(request: Request) {
  // Block in production - this route uses AI and costs money
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "This endpoint is disabled in production" },
      { status: 403 }
    )
  }

  // Check user is allowed to use AI endpoints
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email || !ALLOWED_AI_EMAILS.includes(user.email)) {
    return NextResponse.json(
      { error: "Your account is not authorized to use AI features" },
      { status: 403 }
    )
  }

  try {
    const {
      articleId,
      title,
      sections,
      feedback,
    }: {
      articleId: string
      title: string
      sections: ArticleSection[]
      feedback: ArticleFeedbackFlag[]
    } = await request.json()

    if (!articleId || !title || !sections) {
      return NextResponse.json(
        { error: "articleId, title, and sections are required" },
        { status: 400 }
      )
    }

    const dirPath = path.join(process.cwd(), "docs/articles", articleId)
    await mkdir(dirPath, { recursive: true })

    // Load writing style guide if available
    let styleGuide: string | undefined
    try {
      styleGuide = await readFile(
        path.join(process.cwd(), "docs/articles/writing_style.md"),
        "utf-8"
      )
    } catch {
      // Style guide not found, continue without it
    }

    // Generate revised draft
    const result = await generateRevisedDraft({
      articleId,
      title,
      sections,
      feedback,
      styleGuide,
    })

    // Get current version number
    const files = await readdir(dirPath).catch(() => [] as string[])
    const draftFiles = files.filter((f) => f.match(/^draft\d+\.md$/))
    const versions = draftFiles.map((f) => {
      const match = f.match(/^draft(\d+)\.md$/)
      return match ? parseInt(match[1], 10) : 0
    })
    const currentVersion = versions.length > 0 ? Math.max(...versions) : 0
    const newVersion = currentVersion + 1

    // Save the new draft
    const draftPath = path.join(dirPath, `draft${newVersion}.md`)
    const timestamp = new Date().toLocaleString("da-DK", {
      timeZone: "Europe/Copenhagen",
      dateStyle: "short",
      timeStyle: "short",
    })
    const header = `<!-- Version: ${newVersion} | Generated: ${timestamp} | Changes: ${result.changesSummary.length} sections revised -->\n\n`

    await writeFile(draftPath, header + result.draft, "utf-8")

    return NextResponse.json({
      success: true,
      path: draftPath,
      version: newVersion,
      changesSummary: result.changesSummary,
      meta: result.meta,
    })
  } catch (error) {
    console.error("Failed to generate draft:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    return NextResponse.json(
      {
        error: "Failed to generate draft",
        details: errorMessage,
        stack: errorStack,
      },
      { status: 500 }
    )
  }
}
