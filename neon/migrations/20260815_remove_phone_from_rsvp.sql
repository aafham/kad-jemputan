-- Remove phone collection and storage from an existing Neon RSVP database.
--
-- Prerequisites:
--   1. Temporarily set RSVP_WRITE_ENABLED=false in Vercel and redeploy.
--   2. Run this file once in the Neon SQL Editor as the database owner.
--   3. Deploy the matching phone-free application code, then re-enable writes.
--
-- This is safe to re-run. It preserves every non-phone RSVP field and its
-- timestamps, removes the old phone columns, and replaces the old eight-
-- argument submit_rsvp function with the six-argument insert-only version.
-- No RSVP values are selected or printed by this migration.

begin;

-- Prevent old and new RSVP writes from racing the schema change.
lock table public.rsvp_entries in access exclusive mode;

-- The previous function refers to phone_normalized and phone_hash, so remove
-- that exact overload before dropping the columns it depends on.
drop function if exists public.submit_rsvp(text, text, text, text, text, integer, text, text);

alter table public.rsvp_entries
  drop column if exists phone_normalized,
  drop column if exists phone_hash;

create or replace function public.submit_rsvp(
  p_name text,
  p_ip_hash text,
  p_attendance text,
  p_guest_count integer,
  p_wish text,
  p_wish_status text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  recent_submission_count integer;
begin
  -- Serialise requests per anonymous IP hash so the three-per-ten-minute limit
  -- remains correct even when several requests arrive at the same instant.
  perform pg_advisory_xact_lock(pg_catalog.hashtext(p_ip_hash));

  select count(*)
    into recent_submission_count
    from public.rsvp_submission_events
   where ip_hash = p_ip_hash
     and created_at > now() - interval '10 minutes';

  if recent_submission_count >= 3 then
    raise exception 'rsvp_rate_limit' using errcode = 'P0001';
  end if;

  insert into public.rsvp_submission_events (ip_hash)
  values (p_ip_hash);

  -- There is no contact field or other person-level identifier. Each accepted
  -- form submission is consequently kept as an independent RSVP entry.
  insert into public.rsvp_entries (
    name,
    ip_hash,
    attendance,
    guest_count,
    wish,
    wish_status
  )
  values (
    p_name,
    p_ip_hash,
    p_attendance,
    p_guest_count,
    p_wish,
    p_wish_status
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.submit_rsvp(text, text, text, integer, text, text)
  from public;

commit;

-- PostgreSQL marks dropped columns unavailable immediately. To also rewrite
-- table storage so old column bytes are reclaimed, run this separately after
-- the transaction above succeeds (it takes an exclusive table lock):
--   vacuum (full, analyze) public.rsvp_entries;
