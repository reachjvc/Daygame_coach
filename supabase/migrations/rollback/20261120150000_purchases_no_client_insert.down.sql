-- Undo 20261120150000_purchases_no_client_insert.sql. Puts the client insert policy back as it was.
-- No row changes either way.
create policy "Users can insert their own purchases" on public.purchases for insert with check (auth.uid() = user_id);
