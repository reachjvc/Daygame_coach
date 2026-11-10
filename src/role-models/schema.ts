import { z } from "zod"

import { LIFE_MASTERY_AREA_MAP } from "@/src/goals/data/lifeMasteryAreas"

import { ROLE_MODEL_CATEGORY_MAP } from "./categories"
import { isValueWord } from "./valueWords"

/**
 * The shape of one role model's file (`src/role-models/data/people/<id>.json`).
 *
 * Shape only. The rules that look across fields — evidence from two kinds and two
 * sources, every sourceId existing, a validated person carrying the blind pick
 * and the devil's advocate — live in `checkPerson` (catalogCheck.ts), so each
 * failure can be named on its own.
 */
const text = z.string().trim().min(1)
/** Links shown on the page: https only, so no javascript: or data: address can ride in a file. */
const httpsUrl = z.string().url().refine((u) => u.startsWith("https://"), { message: "links must be https" })

export const sourceSchema = z.object({
  id: text,
  kind: z.enum(["primary", "secondary"]),
  title: text,
  author: text,
  year: z.union([z.number().int(), text]),
  publisher: z.string().optional(),
  url: httpsUrl.optional(),
})

export const evidenceSchema = z.object({
  kind: z.enum(["deed", "words", "witness"]),
  claim: text,
  sourceId: text,
  locator: text,
})

export const valueSchema = z.object({
  word: text.refine(isValueWord, { message: "not a life plan value word" }),
  evidence: z.array(evidenceSchema).min(1),
})

export const principleSchema = z.object({ text, sourceId: text, locator: text })

export const quoteSchema = z.object({
  text,
  sourceId: text,
  locator: text,
  translation: z.string().optional(),
})

export const likenessSourceSchema = z.object({ title: text, url: httpsUrl, licence: text, author: text })

export const REVIEW_STATUSES = ["draft", "validated", "flagged", "excluded", "proposed-remove"] as const

export const reviewSchema = z.object({
  status: z.enum(REVIEW_STATUSES),
  screen: z.object({ result: text, notes: z.string() }),
  blindAgreement: z.number().min(0).max(1).nullable(),
  devilsAdvocate: z.string(),
  checkedOn: text,
})

const yearSchema = z.union([z.number().int(), text])

export const personSchema = z.object({
  id: text.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lower-case words joined by hyphens"),
  name: text,
  /** "she" for the few women; the section headings follow it. Absent means "he". */
  pronoun: z.enum(["he", "she"]).optional(),
  /** null when no reliable source gives it (never guessed). */
  born: yearSchema.nullable(),
  died: yearSchema.nullable(),
  category: text.refine((c) => ROLE_MODEL_CATEGORY_MAP.has(c as never), { message: "unknown category" }),
  areaIds: z.array(text.refine((a) => LIFE_MASTERY_AREA_MAP.has(a), { message: "unknown life plan area" })).min(1).max(3),
  tagline: text,
  startedFrom: text,
  values: z.array(valueSchema).min(3).max(5),
  principles: z.array(principleSchema).min(3).max(5),
  quotes: z.array(quoteSchema).min(1).max(4),
  definingMoment: z.object({ text, sourceIds: z.array(text).min(1) }),
  shadow: z.object({ text, sourceIds: z.array(text).min(1) }),
  councilQuestion: z.object({ text, principleIndex: z.number().int().min(0) }),
  readings: z.array(z.object({ title: text, year: yearSchema })).max(3),
  sources: z.array(sourceSchema).min(1),
  likenessSources: z.array(likenessSourceSchema).max(3).optional(),
  review: reviewSchema,
})
