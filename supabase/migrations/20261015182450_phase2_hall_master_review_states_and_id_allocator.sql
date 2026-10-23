-- Phase 2: allow Hall Master to hold moderation states and reserve submission
-- identities from the same identity sequence used by legacy case_submissions.
-- This migration does not insert or update Hall rows and does not change the
-- existing case_submissions review_status column or the publishing RPC.

do $$
declare
  invalid_rows bigint;
begin
  select count(*) into invalid_rows
  from public.hall_cases_master
  where visibility is distinct from 'published'
     or published_at is null;

  if invalid_rows <> 0 then
    raise exception
      'Phase 2 precondition failed: expected all existing Master rows published with published_at, found % invalid rows',
      invalid_rows;
  end if;
end
$$;

alter table public.hall_cases_master
  drop constraint hall_cases_master_visibility_check;

alter table public.hall_cases_master
  alter column published_at drop not null;

alter table public.hall_cases_master
  add constraint hall_cases_master_visibility_check
  check (visibility in ('pending', 'published', 'rejected'));

alter table public.hall_cases_master
  add constraint hall_cases_master_published_at_check
  check (
    (visibility = 'published' and published_at is not null)
    or (visibility in ('pending', 'rejected') and published_at is null)
  );

alter table public.hall_cases_master
  add column reviewed_at timestamptz,
  add column reviewed_by text,
  add column admin_note text;

-- case_submissions.id is GENERATED ALWAYS AS IDENTITY and is still used by
-- the legacy submission endpoint. Allocating from its sequence makes new
-- direct submissions and legacy submissions share one atomic numeric space.
-- Sequence gaps are expected and never reused. source_order likewise shares
-- the sequence already used by the publishing RPC.
grant usage on sequence public.case_submissions_id_seq to service_role;

create or replace function public.allocate_hall_submission_identity()
returns table (
  case_id text,
  source_record_id text,
  source_order integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  allocated_id bigint;
begin
  allocated_id := pg_catalog.nextval(
    'public.case_submissions_id_seq'::pg_catalog.regclass
  );

  return query
  select
    'submission-' || allocated_id::text,
    allocated_id::text,
    pg_catalog.nextval(
      'public.hall_submission_source_order_seq'::pg_catalog.regclass
    )::integer;
end;
$$;

revoke all on function public.allocate_hall_submission_identity()
  from public, anon, authenticated;
grant execute on function public.allocate_hall_submission_identity()
  to service_role;

-- Rollback before the new submission API is enabled:
--   revoke execute on function public.allocate_hall_submission_identity() from service_role;
--   drop function public.allocate_hall_submission_identity();
--   revoke usage on sequence public.case_submissions_id_seq from service_role;
--   alter table public.hall_cases_master drop constraint hall_cases_master_published_at_check;
--   alter table public.hall_cases_master drop constraint hall_cases_master_visibility_check;
--   alter table public.hall_cases_master add constraint hall_cases_master_visibility_check
--     check (visibility = 'published');
--   alter table public.hall_cases_master alter column published_at set not null;
--   alter table public.hall_cases_master drop column reviewed_at, drop column reviewed_by, drop column admin_note;
-- This rollback requires that no pending/rejected Master rows have been retained.
