/**
 * Articles & Research slice configuration.
 */

import type { ContentPillar, ArticleTier } from "./types"

// ============================================
// Content Pillars
// ============================================

export const CONTENT_PILLARS: ContentPillar[] = [
  {
    id: "learning",
    name: "Learning from Experience",
    description: "How to reflect, grow, and avoid rumination. AARs, sports debriefs, poker mindset, journaling.",
    breadth: "universal",
    icon: "BookOpen",
  },
  {
    id: "inner-game",
    name: "Inner Game & Masculinity",
    description: "Confidence, values, identity, and fear. Self-compassion, approach anxiety, living intentionally.",
    breadth: "broad",
    icon: "Brain",
  },
  {
    id: "action",
    name: "Taking Action IRL",
    description: "Real-world social skills, dating beyond apps. Cold approach, conversation, reading signals.",
    breadth: "medium",
    icon: "Zap",
  },
  {
    id: "tactics",
    name: "Daygame Tactics",
    description: "Specific techniques and practice methods. Openers, text game, field reports, stats.",
    breadth: "narrow",
    icon: "Target",
  },
]

// ============================================
// Article Tiers
// ============================================

export const ARTICLE_TIERS: Record<ArticleTier, { name: string; description: string; badge: string }> = {
  flagship: {
    name: "Flagship",
    description: "Long-form, personal essays with deep insights",
    badge: "Featured",
  },
  standard: {
    name: "Standard",
    description: "Research summaries and frameworks",
    badge: "Article",
  },
  quick: {
    name: "Quick Read",
    description: "Bullet points, takeaways, and quotes",
    badge: "Quick",
  },
}

// ============================================
// Formats that scale well (for content production)
// ============================================

export const SCALABLE_FORMATS = [
  { name: "Research Summaries", example: "What the Science Says About Self-Compassion", reason: "Reporting facts, not opinions" },
  { name: "Framework Breakdowns", example: "The AAR Method Explained", reason: "Teaching a system" },
  { name: "Quote Compilations", example: "25 Quotes on Handling Rejection", reason: "Curation, not creation" },
  { name: "Comparison Posts", example: "Tom Torero vs. Todd V: Different Approaches", reason: "Analysis of existing material" },
  { name: "How-to Guides", example: "How to Write a Field Report (Step by Step)", reason: "Instructional, structured" },
  { name: "Checklists/Templates", example: "Pre-Session Checklist", reason: "Practical tools" },
]

// ============================================
// Display Configuration
// ============================================

export const ARTICLES_CONFIG = {
  defaultPageSize: 12,
  maxPageSize: 50,
  featuredCount: 3,
}
