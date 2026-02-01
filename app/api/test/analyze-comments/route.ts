import { NextResponse } from "next/server"
import { readFile, writeFile } from "fs/promises"
import path from "path"
import {
  analyzeCommentsForLearnings,
  insertLearningIntoStyleGuide,
  updateStyleGuideChangelog,
} from "@/src/articles/articlesService"
import {
  AnalyzeCommentsRequestSchema,
  ApproveLearningsRequestSchema,
} from "@/src/articles/schemas"

const STYLE_GUIDE_PATH = path.join(process.cwd(), "docs/articles/writing_style.md")

/**
 * POST /api/test/analyze-comments
 * Analyzes feedback flags with notes to extract learnings.
 * Returns suggestions for what to add to writing_style.md.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = AnalyzeCommentsRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { flags } = parsed.data

    // Read current style guide for context
    let styleGuide = ""
    try {
      styleGuide = await readFile(STYLE_GUIDE_PATH, "utf-8")
    } catch {
      return NextResponse.json(
        { error: "Could not read writing_style.md" },
        { status: 500 }
      )
    }

    // Analyze comments using AI
    const allSuggestions = await analyzeCommentsForLearnings(flags, styleGuide)

    // Filter to medium and high confidence only
    const suggestions = allSuggestions.filter(
      (s) => s.confidence === "high" || s.confidence === "medium"
    )

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("Failed to analyze comments:", error)
    return NextResponse.json(
      { error: "Failed to analyze comments" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/test/analyze-comments
 * Approves selected learnings and adds them to writing_style.md.
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const parsed = ApproveLearningsRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { approvedSuggestions } = parsed.data

    if (approvedSuggestions.length === 0) {
      return NextResponse.json({ success: true, updatedSections: [] })
    }

    // Read current style guide
    let styleGuide = ""
    try {
      styleGuide = await readFile(STYLE_GUIDE_PATH, "utf-8")
    } catch {
      return NextResponse.json(
        { error: "Could not read writing_style.md" },
        { status: 500 }
      )
    }

    // Insert each approved learning
    const updatedSections: string[] = []
    for (const suggestion of approvedSuggestions) {
      styleGuide = insertLearningIntoStyleGuide(styleGuide, suggestion)
      if (!updatedSections.includes(suggestion.targetSection)) {
        updatedSections.push(suggestion.targetSection)
      }
    }

    // Update changelog
    const changeDescription =
      approvedSuggestions.length === 1
        ? `Added learning to ${updatedSections[0]}`
        : `Added ${approvedSuggestions.length} learnings to ${updatedSections.join(", ")}`
    styleGuide = updateStyleGuideChangelog(styleGuide, changeDescription)

    // Write updated style guide
    await writeFile(STYLE_GUIDE_PATH, styleGuide, "utf-8")

    return NextResponse.json({ success: true, updatedSections })
  } catch (error) {
    console.error("Failed to approve learnings:", error)
    return NextResponse.json(
      { error: "Failed to approve learnings" },
      { status: 500 }
    )
  }
}
