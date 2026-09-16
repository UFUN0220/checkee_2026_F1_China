create table public.hall_cases_master (
  case_id text primary key,
  nickname text,
  location text not null
    check (location in ('北京', '上海', '广州', '沈阳', '武汉')),
  degree text not null,
  major text not null,
  school text,
  interview_date date not null,
  end_date date,
  status text not null
    check (status in ('Check', 'Approved', 'Issued', 'Refused')),
  note text,
  compact_note text,
  detail_note text,
  source text not null
    check (source in ('legacy_excel', 'submission_user', 'admin_import')),
  source_record_id text not null,
  visibility text not null default 'published'
    check (visibility = 'published'),
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hall_cases_master_source_record_id_key
    unique (source, source_record_id),
  constraint hall_cases_master_end_date_check
    check (end_date is null or end_date >= interview_date)
);

alter table public.hall_cases_master enable row level security;

revoke all on table public.hall_cases_master from public, anon, authenticated;
grant select, insert, update on table public.hall_cases_master to service_role;
