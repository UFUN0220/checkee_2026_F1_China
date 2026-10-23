-- Prepared for Phase 3B identity migration; intentionally not applied here.
-- This table records identity changes without rewriting immutable Hall releases.
create table public.hall_case_identity_migrations (
  old_case_id text primary key,
  new_case_id text not null unique,
  old_source text not null,
  new_source text not null,
  old_source_order integer not null,
  new_source_order integer not null,
  old_source_record_id text not null,
  new_source_record_id text not null,
  migrated_at timestamptz not null default transaction_timestamp(),
  migration_batch text not null,
  constraint hall_case_identity_migrations_source_check
    check (old_source = 'legacy_excel' and new_source = 'submission_user'),
  constraint hall_case_identity_migrations_case_id_check
    check (new_case_id like 'submission-%' and old_case_id <> new_case_id),
  constraint hall_case_identity_migrations_order_check
    check (old_source_order > 0 and new_source_order > 0),
  constraint hall_case_identity_migrations_batch_check
    check (btrim(migration_batch) <> ''),
  constraint hall_case_identity_migrations_new_source_order_key
    unique (new_source, new_source_order),
  constraint hall_case_identity_migrations_new_source_record_id_key
    unique (new_source, new_source_record_id),
  constraint hall_case_identity_migrations_old_source_order_key
    unique (old_source, old_source_order),
  constraint hall_case_identity_migrations_old_source_record_id_key
    unique (old_source, old_source_record_id)
);

alter table public.hall_case_identity_migrations enable row level security;

revoke all on table public.hall_case_identity_migrations from public, anon, authenticated;
grant select, insert on table public.hall_case_identity_migrations to service_role;

comment on table public.hall_case_identity_migrations is
  'Append-only audit map for Hall case identity migrations; no public Data API access.';

-- New direct Master writers use a distinct source_record_id namespace. The
-- numeric identity remains allocated from the same sequence used by the old
-- case_submissions identity column and sync RPC.
create or replace function public.allocate_hall_submission_identity()
returns table(case_id text, source_record_id text, source_order integer)
language plpgsql
set search_path to ''
as $function$
declare
  allocated_id bigint;
begin
  allocated_id := pg_catalog.nextval(
    'public.case_submissions_id_seq'::pg_catalog.regclass
  );

  return query
  select
    'submission-' || allocated_id::text,
    'master:' || allocated_id::text,
    pg_catalog.nextval(
      'public.hall_submission_source_order_seq'::pg_catalog.regclass
    )::integer;
end;
$function$;

revoke all on function public.allocate_hall_submission_identity() from public, anon, authenticated;
grant execute on function public.allocate_hall_submission_identity() to service_role;
