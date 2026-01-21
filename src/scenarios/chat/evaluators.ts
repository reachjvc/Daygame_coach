/**
 * Chat Response Evaluators
 *
 * Contains evaluation logic for different scenario types.
 * Each evaluator returns both a small (per-turn) evaluation and
 * a milestone (every 5 turns) evaluation.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SmallEvaluation = {
  score: number
  feedback: string
}

export type MilestoneEvaluation = {
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
  suggestedNextLine?: string
}

export type EvaluationResult = {
  small: SmallEvaluation
  milestone: MilestoneEvaluation
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function clampScore(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)))
}

// ─────────────────────────────────────────────────────────────────────────────
// Opener Evaluator
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateOpenerResponse(userMessage: string): EvaluationResult {
  const normalized = userMessage.trim()
  const lowerMessage = normalized.toLowerCase()
  const wordCount = normalized.split(/\s+/).filter(Boolean).length

  const hasAttentionGetter = /\bexcuse me\b/.test(lowerMessage)
  const hasApologeticFraming =
    /\b(sorry|apologize|apologies)\b/.test(lowerMessage) ||
    /\bsorry to bother\b/.test(lowerMessage) ||
    /\bhope (i'm|i am) not (bothering|interrupting)\b/.test(lowerMessage) ||
    /\bi know you're (probably )?(busy|in a hurry)\b/.test(lowerMessage)
  const hasCompliment = /\b(beautiful|gorgeous|hot|sexy|stunning|cute|pretty)\b/.test(lowerMessage)
  const hasQuestion = normalized.includes("?")
  const isTooShort = wordCount < 4
  const isTooLong = wordCount > 28

  let score = 6
  if (!hasApologeticFraming) score += 1
  if (!hasCompliment) score += 1
  if (hasQuestion) score += 1
  if (isTooShort) score -= 1
  if (isTooLong) score -= 1
  if (hasCompliment) score -= 1
  score = clampScore(score)

  const parts: string[] = []
  if (hasApologeticFraming) parts.push("Drop the apology and lead calmly.")
  if (hasCompliment) parts.push("Avoid generic compliments; go situational instead.")
  if (!hasQuestion) parts.push("Add a simple question to create a hook.")
  if (parts.length === 0) parts.push("Solid opener. Keep it simple and grounded.")
  const feedback = parts.slice(0, 2).join(" ")

  const strengths: string[] = []
  if (hasQuestion) strengths.push("You gave her a clear reason to respond.")
  if (!hasCompliment) strengths.push("You avoided appearance-based flattery.")
  if (!isTooLong) strengths.push("You kept it concise.")
  if (hasAttentionGetter) strengths.push("You used a clean attention-getter.")
  if (strengths.length === 0) strengths.push("You took the initiative to open.")

  const improvements: string[] = []
  if (hasApologeticFraming) improvements.push("Lead without asking permission.")
  if (hasCompliment) improvements.push("Swap the compliment for a situational hook.")
  if (!hasQuestion) improvements.push("End with a question to make replying easy.")
  if (isTooLong) improvements.push("Shorten it to one clean sentence.")
  if (improvements.length === 0) improvements.push("Add a sharper hook to spark curiosity.")

  const suggestedNextLine =
    "Hey, quick question — you look like you know this area. What's the best coffee spot nearby?"

  return {
    small: { score, feedback },
    milestone: {
      score,
      feedback,
      strengths: strengths.slice(0, 2),
      improvements: improvements.slice(0, 2),
      suggestedNextLine,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Career Response Evaluator
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateCareerResponse(
  userMessage: string,
  jobTitle: string
): EvaluationResult {
  const normalized = userMessage.trim()
  const lowerMessage = normalized.toLowerCase()

  const hasTease = /(so you|so you're|so you are|bet you|do you ever|never|always)/.test(lowerMessage)
  const hasPull = /(cool|impressive|respect|like|love|interesting|attractive)/.test(lowerMessage)
  const hasQuestion = /\?/.test(userMessage) || /(what|why|how|got you into)/.test(lowerMessage)

  let score = 6
  if (hasTease) score += 2
  if (hasPull) score += 1
  if (hasQuestion) score += 1
  if (!hasTease && !hasPull) score -= 1
  score = clampScore(score)

  let feedback = ""
  if (hasTease && hasPull) {
    feedback = "Good push/pull. Keep teasing but add warmth so it doesn't feel arrogant."
  } else if (hasTease) {
    feedback = "Nice tease. Add a bit of warmth or curiosity after to keep rapport."
  } else if (hasPull) {
    feedback = "Good warmth, but add a playful tease to create tension."
  } else if (hasQuestion) {
    feedback = "Fine, but don't interview. Add a playful frame before the question."
  } else {
    feedback = "Add a playful tease or a curious hook — don't just acknowledge her job."
  }

  const strengths: string[] = []
  if (hasTease) strengths.push("You teased instead of interviewing.")
  if (hasPull) strengths.push("You added warmth/validation.")
  if (hasQuestion) strengths.push("You kept the conversation moving.")
  if (strengths.length === 0) strengths.push("You responded rather than freezing.")

  const improvements: string[] = []
  if (!hasTease) improvements.push("Add a playful tease (push) to create tension.")
  if (!hasPull) improvements.push("Add a touch of warmth (pull) after the tease.")
  if (!hasQuestion) improvements.push("End with a simple question to keep momentum.")
  if (improvements.length === 0) improvements.push("Tighten the tease and make it more specific.")

  const suggestedNextLine = `So you're a ${jobTitle}... do you ever turn that off, or are you always in work mode?`

  return {
    small: { score, feedback },
    milestone: {
      score,
      feedback,
      strengths: strengths.slice(0, 2),
      improvements: improvements.slice(0, 2),
      suggestedNextLine,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shit-Test Response Evaluator
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateShittestResponse(userMessage: string): EvaluationResult {
  const normalized = userMessage.trim()
  const lowerMessage = normalized.toLowerCase()
  const wordCount = normalized.split(/\s+/).filter(Boolean).length

  const exitSignals = ["no worries", "take care", "have a good", "sorry", "my bad", "all good", "bye"]
  const defensiveSignals = ["what's your problem", "relax", "chill", "whatever", "why would", "you're rude"]
  const playfulSignals = ["haha", "lol", "fair", "just teasing", "just messing", "smile", "laugh"]
  const hasQuestion = normalized.includes("?")

  const exited = exitSignals.some((phrase) => lowerMessage.includes(phrase))
  const defensive = defensiveSignals.some((phrase) => lowerMessage.includes(phrase))
  const playful = playfulSignals.some((phrase) => lowerMessage.includes(phrase))

  let score = 6
  if (playful) score += 2
  if (hasQuestion) score += 1
  if (defensive) score -= 3
  if (exited) score -= 1
  if (wordCount > 35) score -= 1
  score = clampScore(score)

  let feedback = ""
  if (defensive) {
    feedback = "You got defensive. Stay light and playful instead of explaining."
  } else if (exited) {
    feedback = "Polite exit, but you can often stay playful and reframe."
  } else if (playful) {
    feedback = "Good playfulness. Keep it light and keep the frame."
  } else {
    feedback = "Stay relaxed and add a playful reframe to pass the test."
  }

  const strengths: string[] = []
  if (playful) strengths.push("You kept it playful.")
  if (!defensive) strengths.push("You avoided over-explaining.")
  if (hasQuestion) strengths.push("You kept the interaction moving.")
  if (strengths.length === 0) strengths.push("You responded calmly.")

  const improvements: string[] = []
  if (defensive) improvements.push("Drop the defensiveness and tease it off.")
  if (!playful) improvements.push("Add a light joke or tease to disarm the test.")
  if (!hasQuestion) improvements.push("End with a simple question or redirect.")
  if (improvements.length === 0) improvements.push("Hold the frame and keep it light.")

  const suggestedNextLine = "Fair enough. I had to see if you were as serious as you look. What are you up to?"

  return {
    small: { score, feedback },
    milestone: {
      score,
      feedback,
      strengths: strengths.slice(0, 2),
      improvements: improvements.slice(0, 2),
      suggestedNextLine,
    },
  }
}
