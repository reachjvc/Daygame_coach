-- A signed-in person could insert a row into `purchases` for themselves straight
-- from the browser ("Users can insert their own purchases"), so anyone could
-- write a paid-looking purchase without paying. No app code inserts purchases
-- with a person's session; a real purchase is written by the server with the
-- service role, which row security does not fence. Reading your own purchases
-- stays allowed.
-- Proposed in the review of Plans/tests-catch-what-matters.md, Phase 9; the
-- owner said yes on 2026-11-20. Undo: rollback/20261120150000_purchases_no_client_insert.down.sql
drop policy if exists "Users can insert their own purchases" on public.purchases;
