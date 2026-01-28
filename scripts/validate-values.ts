/**
 * Values List Validation Script
 *
 * Systematically tests the proposed expanded values list for:
 * 1. Exact duplicates across categories
 * 2. Near-duplicates (similar words, noun/adjective variants)
 * 3. Coverage of the 18 originally missing role model values
 * 4. Naming consistency (noun vs adjective patterns)
 * 5. Category balance
 *
 * Run: npx ts-node scripts/validate-values.ts
 */

// ============================================================================
// PROPOSED VALUES LIST (from expansion analysis)
// ============================================================================

const PROPOSED_CATEGORIES = {
  PRES: {
    label: "Presence, Charisma & Social Magnetism",
    color: "#FF7043",
    values: [
      "Approachability", "Authenticity", "Charisma", "Charm", "Composure",
      "Directness", "Elegance", "Exuberance", "Flair", "Humor", "Intrigue",
      "Inviting", "Magnetism", "Mystery", "Pleasantness", "Polish",
      "Presence", "Self-expression", "Social intelligence", "Style", "Tact",
      "Vulnerability", "Warmth", "Wit"
    ]
  },
  DISC: {
    label: "Discipline, Structure & Performance",
    color: "#607D8B",
    values: [
      // Current values
      "Accomplishment", "Accuracy", "Achievement", "Alertness", "Careful",
      "Cleanliness", "Clarity", "Commitment", "Competence", "Concentration",
      "Consistency", "Dedication", "Discipline", "Effectiveness", "Efficiency",
      "Excellence", "Focus", "Hard work", "Order", "Organization", "Performance",
      "Productivity", "Professionalism", "Quality", "Results-oriented", "Rigor",
      "Simplicity", "Structure", "Thorough", "Timeliness",
      // New additions
      "Diligence", "Meticulous", "Precision", "Punctuality", "Prepared",
      "Reliable", "Methodical"
    ]
  },
  DRIVE: {
    label: "Courage, Drive & Intensity",
    color: "#E53935",
    values: [
      // Current values
      "Ambition", "Boldness", "Bravery", "Challenge", "Courage", "Decisive",
      "Determination", "Drive", "Endurance", "Fearless", "Ferocious", "Fortitude",
      "Intensity", "Motivation", "Passion", "Persistence", "Strength", "Toughness",
      "Valor", "Vigor",
      // New additions
      "Adventure", "Action", "Daring", "Excitement", "Fierce", "Grit", "Hustle",
      "Nerve", "Proactive", "Relentless", "Resilience", "Tenacity", "Willpower"
    ]
  },
  EMO: {
    label: "Emotional Regulation & Inner State",
    color: "#26A69A",
    values: [
      // Current values
      "Balance", "Calm", "Comfort", "Contentment", "Feelings", "Gratitude",
      "Happiness", "Harmony", "Health", "Moderation", "Optimism", "Patience",
      "Peace", "Present", "Restraint", "Satisfaction", "Security", "Sensitivity",
      "Serenity", "Silence", "Solitude", "Stability", "Temperance", "Thankful",
      "Tranquility",
      // New additions
      "Cheerfulness", "Equanimity", "Inner peace", "Lightness", "Mellow",
      "Mindfulness", "Relaxation", "Self-control", "Stoicism", "Unflappable"
    ]
  },
  ETH: {
    label: "Ethics, Integrity & Moral Compass",
    color: "#1E88E5",
    values: [
      // Current values
      "Accountability", "Candor", "Credibility", "Dependability", "Equality",
      "Ethical", "Fairness", "Fidelity", "Goodness", "Honesty", "Honor",
      "Integrity", "Justice", "Lawful", "Respect", "Responsibility", "Sincerity",
      "Stewardship", "Sustainability", "Tolerance", "Transparency", "Trust", "Truth",
      // New additions
      "Decency", "Discretion", "Forgiveness", "Goodwill", "Nobility", "Ownership",
      "Principled", "Prudence", "Rectitude", "Self-honesty", "Virtue"
    ]
  },
  FREE: {
    label: "Freedom, Power & Independence",
    color: "#FB8C00",
    values: [
      // Current values
      "Assertiveness", "Control", "Empower", "Famous", "Freedom", "Independence",
      "Leadership", "Liberty", "Power", "Prosperity", "Recognition", "Risk",
      "Status", "Success", "Victory", "Wealth", "Winning",
      // New additions
      "Agency", "Autonomy", "Dominance", "Influence", "Potency",
      "Self-determination", "Self-direction", "Sovereignty"
    ]
  },
  GROW: {
    label: "Growth, Learning & Mastery",
    color: "#43A047",
    values: [
      // Current values
      "Adaptability", "Awareness", "Brilliance", "Clever", "Common sense",
      "Consciousness", "Curiosity", "Development", "Discovery", "Experience",
      "Exploration", "Genius", "Growth", "Improvement", "Innovation", "Inquisitive",
      "Insightful", "Intelligence", "Intuitive", "Knowledge", "Learning", "Logic",
      "Mastery", "Realistic", "Reason", "Reflective", "Skill", "Smart", "Talent",
      "Understanding", "Wisdom",
      // New additions
      "Acumen", "Astuteness", "Calibration", "Discernment", "Experimentation",
      "Open-mindedness", "Perception", "Perceptiveness", "Perspective",
      "Reinvention", "Resourcefulness", "Sagacity", "Savvy", "Shrewdness",
      "Versatility"
    ]
  },
  ID: {
    label: "Self-Worth & Identity",
    color: "#5C6BC0",
    values: [
      // Current values
      "Acceptance", "Capable", "Certainty", "Confidence", "Conviction", "Dignity",
      "Grace", "Humility", "Individuality", "Maturity", "Poise", "Self-reliance",
      "Uniqueness",
      // New additions
      "Assurance", "Backbone", "Groundedness", "Inner strength", "Pride",
      "Self-acceptance", "Self-assurance", "Self-awareness", "Self-esteem",
      "Self-possession", "Self-respect"
    ]
  },
  PLAY: {
    label: "Play, Expression & Vitality",
    color: "#FDD835",
    values: [
      // Current values (minus Expressive, moved to PRES as Self-expression)
      "Amusement", "Beauty", "Creation", "Creativity", "Energy", "Enjoyment",
      "Enthusiasm", "Fun", "Imagination", "Irreverent", "Joy", "Originality",
      "Playfulness", "Recreation", "Spontaneous", "Surprise", "Vitality", "Wonder",
      // New additions
      "Adventurousness", "Delight", "Exhilaration", "Expressiveness", "Festivity",
      "Levity", "Liveliness", "Merriment", "Mischief", "Novelty", "Silliness",
      "Whimsy", "Zest"
    ]
  },
  PURP: {
    label: "Purpose, Vision & Meaning",
    color: "#8E24AA",
    values: [
      // Current values
      "Devotion", "Foresight", "Greatness", "Hope", "Inspiring", "Meaning",
      "Potential", "Purpose", "Reverence", "Significance", "Spirit", "Spirituality",
      "Traditional", "Vision",
      // New additions
      "Aspiration", "Calling", "Destiny", "Direction", "Faith", "Fulfillment",
      "Legacy", "Mission", "Sacredness", "Transcendence"
    ]
  },
  SOC: {
    label: "Connection, Love & Belonging",
    color: "#EC407A",
    values: [
      // Current values
      "Altruism", "Attentive", "Charity", "Communication", "Community",
      "Compassion", "Connection", "Contribution", "Cooperation", "Courtesy",
      "Empathy", "Family", "Friendship", "Generosity", "Giving", "Kindness",
      "Love", "Loyalty", "Openness", "Selfless", "Service", "Sharing", "Support",
      "Teamwork", "Thoughtful", "Unity", "Welcoming",
      // New additions
      "Affection", "Belongingness", "Bonding", "Camaraderie", "Caring",
      "Closeness", "Cordiality", "Hospitality", "Intimacy", "Nurturing",
      "Rapport", "Relatedness", "Sympathy", "Tenderness", "Togetherness"
    ]
  }
}

// The 18 originally missing values from role models
const ROLE_MODEL_MISSING = [
  "adventure", "authenticity", "charisma", "charm", "directness",
  "experimentation", "hustle", "influence", "ownership", "presence",
  "reinvention", "resilience", "self-expression", "self-honesty",
  "self-improvement", "style", "wit", "action"
]

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function normalizeValue(v: string): string {
  return v.toLowerCase().replace(/[- ]/g, "")
}

function getAllValues(): { value: string; category: string; normalized: string }[] {
  const all: { value: string; category: string; normalized: string }[] = []
  for (const [cat, data] of Object.entries(PROPOSED_CATEGORIES)) {
    for (const value of data.values) {
      all.push({ value, category: cat, normalized: normalizeValue(value) })
    }
  }
  return all
}

// Test 1: Find exact duplicates across categories
function findExactDuplicates() {
  console.log("\n" + "=".repeat(60))
  console.log("TEST 1: EXACT DUPLICATES ACROSS CATEGORIES")
  console.log("=".repeat(60))

  const all = getAllValues()
  const seen = new Map<string, string[]>()

  for (const { value, category, normalized } of all) {
    if (!seen.has(normalized)) {
      seen.set(normalized, [])
    }
    seen.get(normalized)!.push(`${value} (${category})`)
  }

  let duplicates = 0
  for (const [normalized, locations] of seen) {
    if (locations.length > 1) {
      console.log(`  DUPLICATE: ${locations.join(" vs ")}`)
      duplicates++
    }
  }

  if (duplicates === 0) {
    console.log("  ✓ No exact duplicates found")
  } else {
    console.log(`\n  ✗ Found ${duplicates} duplicates to resolve`)
  }

  return duplicates
}

// Test 2: Find near-duplicates (noun/adjective variants, similar stems)
function findNearDuplicates() {
  console.log("\n" + "=".repeat(60))
  console.log("TEST 2: NEAR-DUPLICATES (similar words)")
  console.log("=".repeat(60))

  const all = getAllValues()
  const nearDuplicates: string[] = []

  // Common patterns to check
  const patterns = [
    // Noun/adjective pairs
    [/ness$/, ""], [/ity$/, ""], [/ment$/, ""], [/tion$/, ""],
    [/ive$/, ""], [/ful$/, ""], [/ous$/, ""]
  ]

  // Check each value against all others
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i].normalized
      const b = all[j].normalized

      // Check if one is substring of the other (min 5 chars)
      if (a.length >= 5 && b.length >= 5) {
        if (a.includes(b) || b.includes(a)) {
          nearDuplicates.push(`  ${all[i].value} (${all[i].category}) ~ ${all[j].value} (${all[j].category})`)
        }
      }

      // Check stem similarity
      const stemA = a.replace(/(ness|ity|ment|tion|ive|ful|ous|ing|ed)$/, "")
      const stemB = b.replace(/(ness|ity|ment|tion|ive|ful|ous|ing|ed)$/, "")
      if (stemA.length >= 4 && stemA === stemB && a !== b) {
        const pair = `  ${all[i].value} (${all[i].category}) ~ ${all[j].value} (${all[j].category})`
        if (!nearDuplicates.includes(pair)) {
          nearDuplicates.push(pair)
        }
      }
    }
  }

  if (nearDuplicates.length === 0) {
    console.log("  ✓ No near-duplicates found")
  } else {
    console.log("  Potential near-duplicates to review:")
    nearDuplicates.forEach(d => console.log(d))
    console.log(`\n  Found ${nearDuplicates.length} pairs to review`)
  }

  return nearDuplicates.length
}

// Test 3: Check coverage of the 18 missing role model values
function checkRoleModelCoverage() {
  console.log("\n" + "=".repeat(60))
  console.log("TEST 3: ROLE MODEL VALUES COVERAGE")
  console.log("=".repeat(60))

  const all = getAllValues()
  const allNormalized = new Set(all.map(v => v.normalized))

  const covered: string[] = []
  const missing: string[] = []

  for (const rmValue of ROLE_MODEL_MISSING) {
    const normalized = normalizeValue(rmValue)

    // Check exact match
    if (allNormalized.has(normalized)) {
      const match = all.find(v => v.normalized === normalized)
      covered.push(`  ✓ ${rmValue} → ${match?.value} (${match?.category})`)
    } else {
      // Check partial match
      const partialMatch = all.find(v =>
        v.normalized.includes(normalized) || normalized.includes(v.normalized)
      )
      if (partialMatch) {
        covered.push(`  ✓ ${rmValue} → ${partialMatch.value} (${partialMatch.category}) [partial]`)
      } else {
        missing.push(`  ✗ ${rmValue} - NOT FOUND`)
      }
    }
  }

  covered.forEach(c => console.log(c))
  missing.forEach(m => console.log(m))

  console.log(`\n  Coverage: ${covered.length}/${ROLE_MODEL_MISSING.length} (${missing.length} missing)`)

  return missing.length
}

// Test 4: Check naming consistency
function checkNamingConsistency() {
  console.log("\n" + "=".repeat(60))
  console.log("TEST 4: NAMING CONSISTENCY")
  console.log("=".repeat(60))

  const all = getAllValues()

  const adjectives: string[] = []
  const nouns: string[] = []
  const compounds: string[] = []
  const phrases: string[] = []

  for (const { value } of all) {
    if (value.includes(" ")) {
      phrases.push(value)
    } else if (value.startsWith("Self-")) {
      compounds.push(value)
    } else if (value.match(/(ive|ful|ous|less|ed|ing|al|ic|ent|ant)$/i)) {
      adjectives.push(value)
    } else {
      nouns.push(value)
    }
  }

  console.log(`  Nouns: ${nouns.length}`)
  console.log(`  Adjectives: ${adjectives.length}`)
  console.log(`  Self-X compounds: ${compounds.length}`)
  console.log(`  Multi-word phrases: ${phrases.length}`)

  console.log("\n  Adjectives in list:")
  adjectives.slice(0, 20).forEach(a => console.log(`    - ${a}`))
  if (adjectives.length > 20) console.log(`    ... and ${adjectives.length - 20} more`)

  console.log("\n  Multi-word phrases:")
  phrases.forEach(p => console.log(`    - ${p}`))

  return { nouns: nouns.length, adjectives: adjectives.length, compounds: compounds.length, phrases: phrases.length }
}

// Test 5: Category balance
function checkCategoryBalance() {
  console.log("\n" + "=".repeat(60))
  console.log("TEST 5: CATEGORY BALANCE")
  console.log("=".repeat(60))

  const counts: { category: string; count: number }[] = []

  for (const [cat, data] of Object.entries(PROPOSED_CATEGORIES)) {
    counts.push({ category: cat, count: data.values.length })
  }

  counts.sort((a, b) => b.count - a.count)

  const total = counts.reduce((sum, c) => sum + c.count, 0)
  const avg = Math.round(total / counts.length)
  const min = Math.min(...counts.map(c => c.count))
  const max = Math.max(...counts.map(c => c.count))

  console.log(`  Total values: ${total}`)
  console.log(`  Categories: ${counts.length}`)
  console.log(`  Average per category: ${avg}`)
  console.log(`  Range: ${min} - ${max}`)
  console.log("")

  for (const { category, count } of counts) {
    const bar = "█".repeat(Math.round(count / 2))
    const status = count < 20 ? " ⚠️ small" : count > 45 ? " ⚠️ large" : ""
    console.log(`  ${category.padEnd(5)} ${String(count).padStart(2)} ${bar}${status}`)
  }

  return { total, avg, min, max }
}

// Test 6: Verify no values were lost from original
function checkNoValuesLost() {
  console.log("\n" + "=".repeat(60))
  console.log("TEST 6: ORIGINAL VALUES PRESERVED")
  console.log("=".repeat(60))

  // Original values that should still exist (spot check)
  const originalSamples = [
    "Accomplishment", "Courage", "Calm", "Honesty", "Freedom",
    "Curiosity", "Confidence", "Creativity", "Purpose", "Empathy"
  ]

  const all = getAllValues()
  const allNormalized = new Set(all.map(v => v.normalized))

  let preserved = 0
  for (const orig of originalSamples) {
    if (allNormalized.has(normalizeValue(orig))) {
      console.log(`  ✓ ${orig}`)
      preserved++
    } else {
      console.log(`  ✗ ${orig} - MISSING`)
    }
  }

  console.log(`\n  Spot check: ${preserved}/${originalSamples.length} preserved`)
  return preserved === originalSamples.length
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

console.log("\n" + "╔" + "═".repeat(58) + "╗")
console.log("║" + " VALUES LIST VALIDATION REPORT ".padStart(44).padEnd(58) + "║")
console.log("╚" + "═".repeat(58) + "╝")

const duplicates = findExactDuplicates()
const nearDupes = findNearDuplicates()
const missingRM = checkRoleModelCoverage()
const naming = checkNamingConsistency()
const balance = checkCategoryBalance()
const preserved = checkNoValuesLost()

console.log("\n" + "=".repeat(60))
console.log("SUMMARY")
console.log("=".repeat(60))
console.log(`  Exact duplicates: ${duplicates === 0 ? "✓ None" : `✗ ${duplicates} found`}`)
console.log(`  Near-duplicates: ${nearDupes} pairs to review`)
console.log(`  Role model coverage: ${missingRM === 0 ? "✓ Complete" : `✗ ${missingRM} missing`}`)
console.log(`  Original values: ${preserved ? "✓ Preserved" : "✗ Some lost"}`)
console.log(`  Total values: ${balance.total}`)
console.log(`  Category range: ${balance.min} - ${balance.max}`)
console.log("")
