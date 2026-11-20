/**
 * THE TITLE OF EACH SECTION, in the real tool's own existing words (the split map names each constant). New words
 * come in Phase 8. A title is what the "See it all" row and the area and goal chips show.
 */
import {
  AREA_REVIEW_COPY,
  COMMIT_COPY,
  FOCUS_COPY,
  NORTH_STAR_SCREEN,
  NS_WHY_ANGLES,
  READBACK_COPY,
  RECAP_COPY,
  REVIEW_INTRO,
  REVIEW_PERIOD_COPY,
  STAR_WORK_INTRO,
  SYSTEMS_COPY,
  VALUES_EVIDENCE,
  VALUES_INTRO,
  VALUES_ORDER,
} from "@/src/goals/data/northStar"
import { ONE_COPY } from "@/src/goals/data/northStarStart"
import type { SectionId } from "./planSections"

export const SECTION_TITLES: Record<SectionId, string> = {
  "star.vision": NORTH_STAR_SCREEN.question,
  "star.self": STAR_WORK_INTRO.title,
  "season.one-thing": ONE_COPY.title,
  "season.why": ONE_COPY.whyTitle,
  "season.who": ONE_COPY.identityTitle,
  "season.areas": FOCUS_COPY.areasTitle,
  "season.order": FOCUS_COPY.orderTitle,
  "values.so-far": VALUES_EVIDENCE.title,
  "values.lists": VALUES_INTRO.title,
  "values.order": VALUES_ORDER.title,
  "everything.driving-force": RECAP_COPY.title,
  "everything.plan": COMMIT_COPY.title,
  "everything.links": SYSTEMS_COPY.linkTitle,
  "everything.check": REVIEW_INTRO.title,
  "everything.commit": COMMIT_COPY.commitTitle,
  "review.open": REVIEW_PERIOD_COPY.title,
  "review.goals": READBACK_COPY.goalsTitle("this period"),
  "review.write": REVIEW_PERIOD_COPY.scoresTitle,
  "area.ten": AREA_REVIEW_COPY.ten.question,
  "area.why": AREA_REVIEW_COPY.purpose.question,
  "goal.shape": "Area and date",
  "goal.why": NS_WHY_ANGLES[0].question,
  "goal.do": "What will you actually do about this?",
  "goal.stops": "What could stop you?",
}

/**
 * A SHORT NAME FOR EACH SCREEN, for Back and Next when a step has several screens ("Season: areas"). Two words at most, taken
 * from the section's own title, so two buttons that lead to different screens of one step never read alike and still fit the bar.
 */
export const SECTION_SHORT: Record<string, string> = {
  "star.vision": "paragraph",
  "star.self": "the rest",
  "season.one-thing": "one thing",
  "season.why": "why",
  "season.who": "who",
  "season.areas": "areas",
  "season.order": "order",
  "values.so-far": "so far",
  "values.lists": "lists",
  "values.order": "order",
  "everything.driving-force": "read",
  "everything.plan": "plan",
  "everything.links": "links",
  "everything.check": "check",
  "everything.commit": "commit",
  "review.open": "open",
  "review.goals": "goals",
  "review.write": "write",
}
