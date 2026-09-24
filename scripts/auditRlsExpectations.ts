/**
 * WHICH TABLES ARE ALLOWED TO HAVE NO PER-PERSON RULE, AND WHY.
 *
 * `scripts/audit-rls.ts` asks the live database which tables have row rules —
 * the database's own answer to "whose rows may this person touch". Some tables
 * are meant to have none: reference data everybody may read, or tables only the
 * server ever touches. Each of those needs a reason written down, or the audit
 * becomes a list nobody reads.
 *
 * WHY IT IS ITS OWN FILE. The map used to sit inside the audit script, which
 * only runs by hand and only with a Supabase login. So an excuse could outlive
 * the thing it excused and nothing would say so: `user_xp` was excused as
 * "pending a keep-or-drop decision" for days after the table itself had been
 * dropped by 20260914120000_drop_four_orphan_tables.sql. Out here,
 * tests/unit/db/auditRlsExpectations.test.ts reads it in every `npm test` run
 * and fails on an excuse for a table that no longer exists.
 */

/** Tables that are deliberately reachable without a per-user rule, with the reason. */
export const INTENTIONAL: Record<string, string> = {
  beta_invites:
    "RLS on, no policies: readable only by service role and the claim_beta_slot() function.",
  waitlist_emails:
    "RLS on, no policies: inserted server-side via service role only.",
  values: "Reference data. Public read is intended; the app reads this table.",
  core_values:
    "RLS on, no policies: no code reads it. Near-duplicate of `values`. Server-only until consolidated.",
  error_reports:
    "RLS on, no policies: crash reports, written and read only by the service role through /api/errors and the admin page. The browser must never touch this table.",
  embeddings_test:
    "RLS on, no policies: read only via the service role in embeddingsTestRepo. Retrieval runs server-side.",
  embeddings: "Shared coaching corpus. Any signed-in user may read all rows.",
}
