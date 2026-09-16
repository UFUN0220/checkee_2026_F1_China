-- Phase 4A corrective migration: qualify master.case_id so it cannot be
-- confused with the function's returned case_id column.

create or replace function public.sync_published_submission_to_hall_master(
  p_submission_id bigint,
  p_decision text
)
returns table (
  submission_id bigint,
  case_id text,
  decision text,
  source_order integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  submission_row public.case_submissions%rowtype;
  master_row public.hall_cases_master%rowtype;
  derived_case_id text;
  allocated_source_order integer;
begin
  if p_submission_id is null or p_submission_id <= 0 then
    raise exception using
      errcode = '22023',
      message = 'Invalid submission id';
  end if;

  if p_decision not in ('published', 'rejected') then
    raise exception using
      errcode = '22023',
      message = 'Invalid submission decision';
  end if;

  select *
  into submission_row
  from public.case_submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Submission not found';
  end if;

  if submission_row.visibility = 'pending' then
    update public.case_submissions
    set visibility = p_decision
    where id = submission_row.id
    returning * into submission_row;
  elsif submission_row.visibility is distinct from p_decision then
    raise exception using
      errcode = '40001',
      message = 'Submission has already been processed';
  end if;

  if p_decision = 'rejected' then
    return query
    select submission_row.id, null::text, 'rejected'::text, null::integer;
    return;
  end if;

  if submission_row.source is distinct from 'submission_user' then
    raise exception using
      errcode = '23514',
      message = 'Only submission_user records can be synchronized to Hall master';
  end if;

  derived_case_id := 'submission-' || submission_row.id::text;

  select master.*
  into master_row
  from public.hall_cases_master as master
  where master.case_id = derived_case_id
  for update;

  if found then
    if master_row.source is distinct from 'submission_user'
      or master_row.source_record_id is distinct from submission_row.id::text then
      raise exception using
        errcode = '23514',
        message = 'Existing Hall master provenance does not match submission';
    end if;

    update public.hall_cases_master as master
    set nickname = submission_row.name,
        location = submission_row.location,
        degree = submission_row.degree,
        major = submission_row.major,
        school = submission_row.school,
        interview_date = submission_row.interview_date,
        end_date = submission_row.end_date,
        status = submission_row.status,
        note = submission_row.note,
        compact_note = submission_row.compact_note,
        detail_note = submission_row.detail_note,
        visibility = 'published',
        published_at = coalesce(submission_row.published_at, now()),
        updated_at = now()
    where master.case_id = derived_case_id
    returning master.source_order into allocated_source_order;

    return query
    select submission_row.id, derived_case_id, 'updated'::text, allocated_source_order;
    return;
  end if;

  allocated_source_order := nextval('public.hall_submission_source_order_seq'::regclass)::integer;

  insert into public.hall_cases_master (
    case_id,
    nickname,
    location,
    degree,
    major,
    school,
    interview_date,
    end_date,
    status,
    note,
    compact_note,
    detail_note,
    source,
    source_record_id,
    visibility,
    published_at,
    created_at,
    updated_at,
    source_order
  )
  values (
    derived_case_id,
    submission_row.name,
    submission_row.location,
    submission_row.degree,
    submission_row.major,
    submission_row.school,
    submission_row.interview_date,
    submission_row.end_date,
    submission_row.status,
    submission_row.note,
    submission_row.compact_note,
    submission_row.detail_note,
    'submission_user',
    submission_row.id::text,
    'published',
    coalesce(submission_row.published_at, now()),
    submission_row.created_at,
    now(),
    allocated_source_order
  );

  return query
  select submission_row.id, derived_case_id, 'inserted'::text, allocated_source_order;
end;
$$;

revoke all on function public.sync_published_submission_to_hall_master(bigint, text)
  from public, anon, authenticated;
grant execute on function public.sync_published_submission_to_hall_master(bigint, text)
  to service_role;
