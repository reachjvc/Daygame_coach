import { NextResponse } from "next/server"
import { readFile, readdir } from "fs/promises"
import path from "path"
import type { ArticleManifest, ArticlePhase } from "@/src/articles/types"

interface ArticleInfo {
  id: string
  title: string
  status: string
  phase: ArticlePhase
  drafts: string[]
  feedbacks: string[]
  hasManifest: boolean
}

/**
 * GET /api/test/articles - List all articles
 * GET /api/test/articles?id=xxx - Get specific article details
 * GET /api/test/articles?id=xxx&draft=1 - Get specific draft content
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const articleId = searchParams.get("id")
  const draftVersion = searchParams.get("draft")

  const articlesDir = path.join(process.cwd(), "docs/articles")

  try {
    // If specific draft requested, return its content parsed into sections
    if (articleId && draftVersion) {
      return await getDraftContent(articlesDir, articleId, draftVersion)
    }

    // If specific article requested, return its details
    if (articleId) {
      return await getArticleDetails(articlesDir, articleId)
    }

    // Otherwise, list all articles
    return await listArticles(articlesDir)
  } catch (error) {
    console.error("Articles API error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

async function listArticles(articlesDir: string) {
  const entries = await readdir(articlesDir, { withFileTypes: true })
  const folders = entries.filter((e) => e.isDirectory())

  const articles: ArticleInfo[] = []

  for (const folder of folders) {
    const folderPath = path.join(articlesDir, folder.name)
    const files = await readdir(folderPath)

    // Check for manifest
    let title = folder.name
    let status = "unknown"
    let phase: ArticlePhase = 1
    const hasManifest = files.includes("manifest.json")

    if (hasManifest) {
      try {
        const manifestContent = await readFile(
          path.join(folderPath, "manifest.json"),
          "utf-8"
        )
        const manifest = JSON.parse(manifestContent) as ArticleManifest
        title = manifest.title
        status = manifest.status
        phase = manifest.phase || 1
      } catch {
        // Ignore parse errors
      }
    }

    const drafts = files
      .filter((f) => f.match(/^draft\d+(_\w+)?\.md$/))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || "0")
        const numB = parseInt(b.match(/\d+/)?.[0] || "0")
        if (numA !== numB) return numA - numB
        // Same version number, sort by suffix (no suffix first)
        return a.localeCompare(b)
      })

    const feedbacks = files
      .filter((f) => f.match(/^feedback\d+\.json$/))
      .sort()

    articles.push({
      id: folder.name,
      title,
      status,
      phase,
      drafts,
      feedbacks,
      hasManifest,
    })
  }

  return NextResponse.json({ articles })
}

async function getArticleDetails(articlesDir: string, articleId: string) {
  const folderPath = path.join(articlesDir, articleId)
  const files = await readdir(folderPath)

  let manifest: ArticleManifest | null = null
  if (files.includes("manifest.json")) {
    const content = await readFile(
      path.join(folderPath, "manifest.json"),
      "utf-8"
    )
    manifest = JSON.parse(content)
  }

  const drafts = files
    .filter((f) => f.match(/^draft\d+(_\w+)?\.md$/))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || "0")
      const numB = parseInt(b.match(/\d+/)?.[0] || "0")
      if (numA !== numB) return numA - numB
      // Same version number, sort by suffix (no suffix first)
      return a.localeCompare(b)
    })

  const feedbacks = files.filter((f) => f.match(/^feedback\d+\.json$/)).sort()

  return NextResponse.json({
    id: articleId,
    manifest,
    drafts,
    feedbacks,
  })
}

async function getDraftContent(
  articlesDir: string,
  articleId: string,
  draftVersion: string
) {
  const folderPath = path.join(articlesDir, articleId)

  // draftVersion can be a number (e.g., "8") or full filename (e.g., "draft8_edwin")
  let draftPath: string
  let actualFilename: string

  if (draftVersion.startsWith("draft")) {
    // Full filename passed (without .md extension)
    actualFilename = draftVersion + ".md"
    draftPath = path.join(folderPath, actualFilename)
  } else {
    // Version number passed - search for matching file
    const files = await readdir(folderPath)
    const matchingDrafts = files.filter(f => {
      const match = f.match(/^draft(\d+)(_\w+)?\.md$/)
      return match && match[1] === draftVersion
    })

    if (matchingDrafts.length === 0) {
      throw new Error(`Draft version ${draftVersion} not found`)
    }

    // Prefer exact match (draftN.md) over suffixed (draftN_author.md)
    actualFilename = matchingDrafts.find(f => f === `draft${draftVersion}.md`) || matchingDrafts[0]
    draftPath = path.join(folderPath, actualFilename)
  }

  // Read draft content
  const draftContent = await readFile(draftPath, "utf-8")

  // Try to read manifest for section structure
  let manifest: ArticleManifest | null = null
  try {
    const manifestContent = await readFile(
      path.join(folderPath, "manifest.json"),
      "utf-8"
    )
    manifest = JSON.parse(manifestContent)
  } catch {
    // No manifest, will generate section IDs
  }

  // Parse markdown into sections
  const sections = parseDraftIntoSections(draftContent, manifest)

  // Extract title from first heading or manifest
  let title = manifest?.title || articleId
  const titleMatch = draftContent.match(/^#\s+(.+)$/m)
  if (titleMatch) {
    title = titleMatch[1]
  }

  return NextResponse.json({
    id: articleId,
    version: parseInt(draftVersion),
    title,
    sections,
    rawContent: draftContent,
    // Progressive commitment fields
    phase: manifest?.phase || 1,
    contract: manifest?.contract || null,
    outline: manifest?.outline || null,
    phaseLocks: manifest?.phaseLocks || {},
    structureUnlocks: manifest?.structureUnlocks || [],
  })
}

function parseDraftIntoSections(
  content: string,
  manifest: ArticleManifest | null
): Array<{ id: string; content: string }> {
  // Remove HTML comments (version headers)
  const cleanContent = content.replace(/<!--[\s\S]*?-->/g, "").trim()

  // Split by horizontal rules
  const parts = cleanContent.split(/\n---\n/).map((p) => p.trim())

  // Filter out empty parts and metadata (title, status lines)
  const contentParts = parts.filter((part) => {
    // Skip if it's just the title heading
    if (part.match(/^#\s+.+\n\n\*\*Status:/)) {
      // This is the header block, extract just the content after metadata
      const lines = part.split("\n")
      const contentStart = lines.findIndex(
        (l, i) => i > 0 && !l.startsWith("**") && l.trim() !== ""
      )
      if (contentStart === -1) return false
      return true
    }
    // Skip empty or very short parts
    if (part.length < 20) return false
    return true
  })

  // Process parts to extract actual content
  const processedParts: string[] = []
  for (const part of contentParts) {
    if (part.match(/^#\s+.+\n\n\*\*Status:/)) {
      // Header block - extract content after metadata
      const lines = part.split("\n")
      const contentStart = lines.findIndex(
        (l, i) => i > 2 && !l.startsWith("**") && l.trim() !== ""
      )
      if (contentStart !== -1) {
        processedParts.push(lines.slice(contentStart).join("\n").trim())
      }
    } else {
      processedParts.push(part)
    }
  }

  // Map to sections with IDs from manifest or generated
  // Support both new outline.sections format and legacy sections format
  const outlineSections = manifest?.outline?.sections
  const legacySections = manifest?.sections

  return processedParts.map((content, index) => {
    const sectionId = outlineSections?.[index]?.id || legacySections?.[index]?.id || `section-${index + 1}`
    return { id: sectionId, content }
  })
}
