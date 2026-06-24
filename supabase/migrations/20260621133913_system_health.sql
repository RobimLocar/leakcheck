-- Singleton row tracking cron heartbeat + send-failure rate, so we can
-- detect silent platform-level failures (cron stopped firing, Resend/Twilio
-- outage causing a wave of failed sends) instead of only finding out when a
-- customer complains. id is a boolean PK with a check constraint forcing it
-- to always be `true`, which guarantees exactly one row can ever exist.
create table if not exists public.system_health (
  id boolean primary key default true check (id),
  last_cron_run_at timestamptz,
  last_cron_ok boolean,
  last_send_failure_count int not null default 0
);

insert into public.system_health (id) values (true) on conflict (id) do nothing;
