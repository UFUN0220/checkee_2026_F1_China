-- Isolated PostgreSQL 17 fixture for the Phase 4C integration run.
-- This is test-only scaffolding, not a production migration.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create table public.case_submissions (
  id bigint generated always as identity primary key,
  source text not null default 'submission_user',
  visibility text not null default 'pending',
  review_status text,
  name text,
  location text not null check (location in ('北京', '上海', '广州', '沈阳', '武汉')),
  degree text not null,
  major text not null,
  school text,
  interview_date date not null,
  end_date date,
  waiting_days integer,
  status text not null check (status in ('Check', 'Approved', 'Issued', 'Refused')),
  note text,
  compact_note text,
  detail_note text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.case_submissions enable row level security;
revoke all on public.case_submissions from public, anon, authenticated;
grant select, insert, update on public.case_submissions to service_role;
grant usage, select on sequence public.case_submissions_id_seq to service_role;

create sequence public.hall_submission_source_order_seq;
revoke all on sequence public.hall_submission_source_order_seq from public, anon, authenticated;
grant usage, select on sequence public.hall_submission_source_order_seq to service_role;

create table public.hall_cases_master (
  case_id text primary key,
  nickname text,
  location text not null check (location in ('北京', '上海', '广州', '沈阳', '武汉')),
  degree text not null,
  major text not null,
  school text,
  interview_date date not null,
  end_date date,
  status text not null check (status in ('Check', 'Approved', 'Issued', 'Refused')),
  note text,
  compact_note text,
  detail_note text,
  source text not null check (source in ('legacy_excel', 'submission_user', 'admin_import')),
  source_record_id text not null,
  visibility text not null default 'published' check (visibility = 'published'),
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_order integer not null,
  constraint hall_cases_master_source_record_id_key unique (source, source_record_id),
  constraint hall_cases_master_source_order_key unique (source, source_order),
  constraint hall_cases_master_end_date_check check (end_date is null or end_date >= interview_date)
);
alter table public.hall_cases_master enable row level security;
revoke all on public.hall_cases_master from public, anon, authenticated;
grant select, insert, update on public.hall_cases_master to service_role;

insert into public.hall_cases_master (
  case_id, nickname, location, degree, major, source, source_record_id,
  interview_date, status, visibility, published_at, source_order
) values (
  'fixture-legacy-1', 'Fixture legacy', '北京', 'Master', 'Test major',
  'legacy_excel', 'fixture:legacy:1', '2026-09-01', 'Check', 'published',
  '2026-10-01T00:00:00Z', 1
);
