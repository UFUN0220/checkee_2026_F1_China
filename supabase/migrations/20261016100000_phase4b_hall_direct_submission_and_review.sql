-- Phase 4B: direct Hall Master submissions, database-atomic identity allocation,
-- request idempotency, server-side rate limiting, and conditional Admin review.
-- Apply only after the Phase 2 and Phase 4A migrations.

create table public.hall_submission_rate_limits (
  rate_limit_key text primary key
    check (rate_limit_key ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default transaction_timestamp()
);

alter table public.hall_submission_rate_limits enable row level security;
revoke all on table public.hall_submission_rate_limits from public, anon, authenticated;
revoke all on table public.hall_submission_rate_limits from service_role;

create table public.hall_submission_idempotency (
  idempotency_key text primary key
    check (idempotency_key ~ '^[0-9a-f]{64}$'),
  request_fingerprint text not null
    check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  case_id text not null unique,
  created_at timestamptz not null default transaction_timestamp(),
  constraint hall_submission_idempotency_case_id_check
    check (case_id ~ '^submission-[0-9]+$')
);

alter table public.hall_submission_idempotency enable row level security;
revoke all on table public.hall_submission_idempotency from public, anon, authenticated;
revoke all on table public.hall_submission_idempotency from service_role;

create or replace function public.submit_hall_case(
  p_idempotency_key text,
  p_rate_limit_key text,
  p_request_fingerprint text,
  p_nickname text,
  p_location text,
  p_degree text,
  p_major text,
  p_school text,
  p_interview_date date,
  p_end_date date,
  p_status text,
  p_note text,
  p_compact_note text,
  p_detail_note text
)
returns table (
  case_id text,
  source_record_id text,
  source_order integer,
  visibility text,
  published_at timestamptz,
  rate_limited boolean,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  existing_case_id text;
  existing_request_fingerprint text;
  allocated_case_id text;
  allocated_source_record_id text;
  allocated_source_order integer;
  existing_master public.hall_cases_master%rowtype;
  v_request_count integer;
  now_at timestamptz := pg_catalog.transaction_timestamp();
begin
  if p_idempotency_key is null or p_idempotency_key !~ '^[0-9a-f]{64}$'
    or p_rate_limit_key is null or p_rate_limit_key !~ '^[0-9a-f]{64}$'
    or p_request_fingerprint is null or p_request_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid request identity';
  end if;
  if p_nickname is not null and pg_catalog.char_length(p_nickname) > 120
    or p_location is null or p_location not in ('北京', '上海', '广州', '沈阳', '武汉')
    or p_degree is null or p_degree not in ('Bachelor', 'Master', 'PhD')
    or p_major is null or pg_catalog.char_length(pg_catalog.btrim(p_major)) not between 1 and 120
    or p_school is not null and pg_catalog.char_length(p_school) > 160
    or p_note is not null and pg_catalog.char_length(p_note) > 1000
    or p_compact_note is not null and pg_catalog.char_length(p_compact_note) > 1000
    or p_detail_note is not null and pg_catalog.char_length(p_detail_note) > 1000
    or p_interview_date is null
    or p_end_date is not null and p_end_date < p_interview_date
    or p_status is null or p_status not in ('Check', 'Approved', 'Issued', 'Refused') then
    raise exception using errcode = '22023', message = 'Invalid submission fields';
  end if;

  -- Serialize retries carrying the same token. A repeated request returns the
  -- original row and never allocates another identity or creates another row.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_idempotency_key, 0));
  select i.case_id, i.request_fingerprint
    into existing_case_id, existing_request_fingerprint
  from public.hall_submission_idempotency as i
  where i.idempotency_key = p_idempotency_key;
  if existing_case_id is not null then
    if existing_request_fingerprint <> p_request_fingerprint then
      raise exception using errcode = '22023', message = 'Idempotency key reused with different payload';
    end if;
    select m.* into existing_master
    from public.hall_cases_master as m
    where m.case_id = existing_case_id;
    if not found then
      raise exception using errcode = '23514', message = 'Idempotency record has no Master row';
    end if;
    return query select existing_master.case_id, existing_master.source_record_id,
      existing_master.source_order, existing_master.visibility, existing_master.published_at,
      false, true;
    return;
  end if;

  -- A persisted 15-minute window limit (5 submissions per client key). The
  -- upsert lock makes concurrent requests share one counter.
  delete from public.hall_submission_rate_limits as r
  where r.updated_at < now_at - interval '1 day';
  insert into public.hall_submission_rate_limits as current_limit (
    rate_limit_key, window_started_at, request_count, updated_at
  ) values (p_rate_limit_key, now_at, 1, now_at)
  on conflict (rate_limit_key) do update
  set window_started_at = case
        when current_limit.window_started_at <= now_at - interval '15 minutes' then now_at
        else current_limit.window_started_at
      end,
      request_count = case
        when current_limit.window_started_at <= now_at - interval '15 minutes' then 1
        else current_limit.request_count + 1
      end,
      updated_at = now_at
  returning request_count into v_request_count;

  if v_request_count > 5 then
    return query select null::text, null::text, null::integer, null::text,
      null::timestamptz, true, false;
    return;
  end if;

  select allocation.case_id, allocation.source_record_id, allocation.source_order
    into allocated_case_id, allocated_source_record_id, allocated_source_order
  from public.allocate_hall_submission_identity() as allocation;
  if allocated_case_id !~ '^submission-[0-9]+$'
    or allocated_source_record_id <> 'master:' || pg_catalog.substr(allocated_case_id, 12)
    or allocated_source_order is null or allocated_source_order < 1 then
    raise exception using errcode = '23514', message = 'Hall identity allocator returned an invalid identity';
  end if;

  insert into public.hall_cases_master (
    case_id, nickname, location, degree, major, school,
    interview_date, end_date, status, note, compact_note, detail_note,
    source, source_record_id, source_order, visibility, published_at
  ) values (
    allocated_case_id, nullif(pg_catalog.btrim(p_nickname), ''), p_location, p_degree,
    pg_catalog.btrim(p_major), nullif(pg_catalog.btrim(p_school), ''),
    p_interview_date, p_end_date,
    case when p_status = 'Refused' and p_end_date is null then 'Check' else p_status end,
    nullif(pg_catalog.btrim(p_note), ''), nullif(pg_catalog.btrim(p_compact_note), ''),
    nullif(pg_catalog.btrim(p_detail_note), ''), 'submission_user',
    allocated_source_record_id, allocated_source_order, 'pending', null
  );

  insert into public.hall_submission_idempotency (idempotency_key, request_fingerprint, case_id)
  values (p_idempotency_key, p_request_fingerprint, allocated_case_id);

  return query select allocated_case_id, allocated_source_record_id,
    allocated_source_order, 'pending'::text, null::timestamptz, false, false;
end;
$function$;

create or replace function public.review_hall_master_submission(
  p_case_id text,
  p_decision text,
  p_admin_note text,
  p_reviewed_by text
)
returns table (
  case_id text,
  visibility text,
  published_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_case_id is null or p_case_id !~ '^submission-[0-9]+$'
    or p_decision not in ('published', 'rejected')
    or p_admin_note is not null and pg_catalog.char_length(p_admin_note) > 1000
    or p_reviewed_by is null or pg_catalog.btrim(p_reviewed_by) = '' then
    raise exception using errcode = '22023', message = 'Invalid review decision';
  end if;

  return query
  update public.hall_cases_master as m
  set visibility = p_decision,
      published_at = case when p_decision = 'published' then pg_catalog.clock_timestamp() else null end,
      reviewed_at = pg_catalog.clock_timestamp(),
      reviewed_by = pg_catalog.btrim(p_reviewed_by),
      admin_note = nullif(pg_catalog.btrim(p_admin_note), ''),
      updated_at = pg_catalog.clock_timestamp()
  where m.case_id = p_case_id
    and m.source = 'submission_user'
    and m.source_record_id = 'master:' || pg_catalog.substr(p_case_id, 12)
    and m.visibility = 'pending'
  returning m.case_id, m.visibility, m.published_at, m.reviewed_at, m.reviewed_by;
end;
$function$;

revoke all on function public.submit_hall_case(
  text, text, text, text, text, text, text, text, date, date, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.submit_hall_case(
  text, text, text, text, text, text, text, text, date, date, text, text, text, text
) to service_role;

revoke all on function public.review_hall_master_submission(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.review_hall_master_submission(text, text, text, text)
  to service_role;

comment on function public.submit_hall_case(
  text, text, text, text, text, text, text, text, date, date, text, text, text, text
) is 'Atomically rate-limits, allocates a shared Hall identity, and inserts one pending direct Master submission.';
comment on function public.review_hall_master_submission(text, text, text, text)
  is 'Conditionally reviews a direct Master submission; only the server-side Admin API may invoke it.';
