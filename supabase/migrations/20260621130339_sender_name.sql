-- Lets Pro users put their own brand/name on recovery emails instead of a
-- generic "LeakCheck" sender, and replies route to their real inbox instead
-- of a no-reply address — both are common reasons customers ignore or
-- distrust dunning emails (see lib/recovery/messageTemplates.ts rationale).
alter table public.profiles
  add column if not exists sender_name text;
