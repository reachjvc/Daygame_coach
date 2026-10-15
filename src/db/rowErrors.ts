/**
 * "THERE IS NO SUCH ROW" — the one definition, for every read by id.
 *
 * Two answers mean it. PostgREST's PGRST116 is a well-formed id that matched
 * nothing. Postgres' 22P02 — invalid input syntax for type uuid — is an id that
 * cannot name a row at all: a truncated link, `abc`, `-1`. The second used to
 * be a fault, so a malformed id in a URL answered 500 and filed a crash report
 * (the junk-parameter sweep logged six for /api/tracking/field-report/[id] on
 * every run), while a well-formed missing one correctly answered 404. Nothing
 * is wrong on this side in either case and no retry will help.
 *
 * `workoutRepo` had this rule privately as `idCannotExist`; it lives here so
 * every read by id gives the same answer.
 */
export function noSuchRow(error: { code?: string } | null | undefined): boolean {
  return error?.code === "PGRST116" || error?.code === "22P02"
}

/** Only the malformed-id half, for reads that tell "missing" from "cannot exist". */
export function idCannotExist(error: { code?: string } | null | undefined): boolean {
  return error?.code === "22P02"
}
