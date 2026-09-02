-- A user's timezone is never absent, and never absent silently.
--
-- One of three accounts had `profiles.timezone = null`. Every caller of
-- getUserTimezone fell back to UTC without saying so, which CLAUDE.md forbids —
-- and a UTC fallback for a Copenhagen user moves every period boundary by two
-- hours, which is exactly the class of bug the counter work is fixing.
--
-- 'UTC' as a DEFAULT is a visible, recorded value that onboarding overwrites
-- with the detected zone. It is not the same thing as a fallback nobody sees.

update profiles set timezone = 'UTC' where timezone is null;
alter table profiles alter column timezone set default 'UTC';
alter table profiles alter column timezone set not null;
