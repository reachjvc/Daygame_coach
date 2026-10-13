-- THE ONE THING A PUBLIC-SCHEMA DUMP CANNOT CARRY.
--
-- `supabase db dump` writes the public schema. The trigger that gives every new
-- account its profile row lives on auth.users, in Supabase's own schema, so it
-- is not in tests/db/baseline.sql. Without it a new test user has no profile,
-- and every foreign key to profiles fails. The function it calls is in the
-- baseline; this only attaches it, exactly as
-- supabase/migrations/20260101000000_create_profiles.sql does.
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
