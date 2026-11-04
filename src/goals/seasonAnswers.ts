import { ONE_ANSWERS } from "./data/northStarStart"

/**
 * The answers that belong to one season, without its sentence (kept on the
 * season itself). Its own module because the plan's loader, the mapper and the
 * season's own functions all need it, and the last of those imports the first.
 */
export const SEASON_ANSWER_KEYS = [ONE_ANSWERS.why, ONE_ANSWERS.cost, ONE_ANSWERS.identity, ONE_ANSWERS.values, ONE_ANSWERS.areas] as const
