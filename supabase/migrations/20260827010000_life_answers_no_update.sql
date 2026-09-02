-- Make "append only" true, not merely policy.
--
-- WHY: the table has no UPDATE policy, and I claimed that made rewriting an
-- answer in place unrepresentable. It does not. RLS policies constrain the
-- app's authenticated client and nothing else — the service-role key and the
-- SQL editor bypass them entirely. Proved the hard way on 2026-08-27: an
-- `update life_answers set body = 'rewritten'` run as a constraint probe went
-- straight through and destroyed a real answer a real person had written
-- ninety seconds earlier. The text is not recoverable.
--
-- A trigger binds everyone, including the service role and including me.
-- Correcting an answer is: delete the row, write a new one.

create or replace function public.life_answers_reject_update()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'life_answers is append-only: delete the row and write a new one (attempted update on %)', old.id
    using errcode = 'restrict_violation';
end;
$$;

drop trigger if exists life_answers_no_update on public.life_answers;

create trigger life_answers_no_update
  before update on public.life_answers
  for each row execute function public.life_answers_reject_update();

comment on function public.life_answers_reject_update() is
  'Append-only enforcement for life_answers. Binds the service role too, unlike an RLS policy.';
