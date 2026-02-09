import { PRINCIPLES } from "../data/principles"
import type { Principle } from "../types"

/**
 * Get principles relevant to a specific goal category
 * @param category - The goal category (e.g., "daygame", "fitness")
 * @param limit - Maximum number of principles to return (default: 3)
 * @returns Array of principles that apply to the given category
 */
export function getPrinciplesForGoalCategory(
  category: string,
  limit: number = 3
): Principle[] {
  const normalizedCategory = category.toLowerCase()

  const relevantPrinciples = PRINCIPLES.filter(
    (p) => p.goalCategories?.includes(normalizedCategory)
  )

  // Shuffle and return limited number for variety
  const shuffled = [...relevantPrinciples].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, limit)
}

/**
 * Get a single random principle for a goal category
 * @param category - The goal category
 * @returns A single principle or undefined if none found
 */
export function getRandomPrincipleForGoal(
  category: string
): Principle | undefined {
  const principles = getPrinciplesForGoalCategory(category, 1)
  return principles[0]
}

/**
 * Get universal principles that apply to all goal categories
 * @param limit - Maximum number of principles to return
 * @returns Array of principles with 5 or more goal categories
 */
export function getUniversalPrinciples(limit: number = 3): Principle[] {
  const universal = PRINCIPLES.filter(
    (p) => p.goalCategories && p.goalCategories.length >= 4
  )
  const shuffled = [...universal].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, limit)
}
