/**
 * Articles & Research slice types following vertical slice architecture.
 */

// ============================================
// Article types
// ============================================

export type ArticleTier = "flagship" | "standard" | "quick"
export type ArticlePillar = "learning" | "inner-game" | "action" | "tactics"
export type ArticleStatus = "draft" | "published" | "archived"

export interface Article {
  id: string
  slug: string
  title: string
  description: string
  content: string
  tier: ArticleTier
  pillar: ArticlePillar
  status: ArticleStatus
  readTimeMinutes: number
  isPremium: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  metadata: ArticleMetadata
}

export interface ArticleMetadata {
  keywords: string[]
  author: string
  featuredImage?: string
  relatedArticleIds?: string[]
}

// ============================================
// Content Pillar definitions
// ============================================

export interface ContentPillar {
  id: ArticlePillar
  name: string
  description: string
  breadth: "universal" | "broad" | "medium" | "narrow"
  icon: string
}

// ============================================
// Article list/card types
// ============================================

export interface ArticleCard {
  id: string
  slug: string
  title: string
  description: string
  tier: ArticleTier
  pillar: ArticlePillar
  readTimeMinutes: number
  isPremium: boolean
  publishedAt: string | null
}

// ============================================
// Filter/sort types
// ============================================

export interface ArticleFilters {
  pillar?: ArticlePillar
  tier?: ArticleTier
  isPremium?: boolean
}

export type ArticleSortBy = "newest" | "oldest" | "readTime"
