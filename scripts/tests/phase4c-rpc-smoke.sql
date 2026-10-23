\set ON_ERROR_STOP on
do $$
begin
  if (select count(*) from public.hall_cases_master) <> 1 then
    raise exception 'fixture baseline should contain one Master row';
  end if;
  if has_table_privilege('anon', 'public.hall_cases_master', 'INSERT')
     or has_table_privilege('authenticated', 'public.hall_cases_master', 'UPDATE') then
    raise exception 'public roles have write access to Master';
  end if;
  if has_function_privilege('anon', 'public.submit_hall_case(text,text,text,text,text,text,text,text,date,date,text,text,text,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.review_hall_master_submission(text,text,text,text)', 'EXECUTE') then
    raise exception 'public roles can execute privileged RPCs';
  end if;
  if not has_function_privilege('service_role', 'public.submit_hall_case(text,text,text,text,text,text,text,text,date,date,text,text,text,text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.review_hall_master_submission(text,text,text,text)', 'EXECUTE') then
    raise exception 'service_role lacks required RPC execute';
  end if;
  if (select prosecdef from pg_proc where oid = 'public.submit_hall_case(text,text,text,text,text,text,text,text,date,date,text,text,text,text)'::regprocedure) is not true
     or (select prosecdef from pg_proc where oid = 'public.review_hall_master_submission(text,text,text,text)'::regprocedure) is not true then
    raise exception 'submission/review RPC must be SECURITY DEFINER';
  end if;
  if (select prosecdef from pg_proc where oid = 'public.allocate_hall_submission_identity()'::regprocedure) is not false then
    raise exception 'allocator security mode changed unexpectedly';
  end if;
end
$$;

do $$
declare
  submitted record;
  replay record;
begin
  select * into submitted from public.submit_hall_case(
    repeat('a',64), repeat('b',64), repeat('c',64), 'Phase 4C user', '北京',
    'Master', 'Synthetic major', null, '2026-10-01', null, 'Check',
    'Synthetic note', 'Synthetic note', 'Synthetic note'
  );
  if submitted.case_id !~ '^submission-[0-9]+$'
     or submitted.source_record_id <> 'master:' || substr(submitted.case_id, 12)
     or submitted.visibility <> 'pending' or submitted.published_at is not null
     or submitted.rate_limited or submitted.replayed then
    raise exception 'submission RPC returned invalid identity/state';
  end if;
  if not exists (
    select 1 from public.hall_cases_master m
    where m.case_id = submitted.case_id and m.source = 'submission_user'
      and m.visibility = 'pending' and m.published_at is null
      and m.location = '北京' and m.degree = 'Master'
      and m.major = 'Synthetic major' and m.status = 'Check'
      and m.note = 'Synthetic note'
  ) then
    raise exception 'submission RPC did not persist the expected pending row';
  end if;
  if exists (select 1 from public.case_submissions) then
    raise exception 'direct submission unexpectedly wrote case_submissions';
  end if;

  select * into replay from public.submit_hall_case(
    repeat('a',64), repeat('b',64), repeat('c',64), 'Phase 4C user', '北京',
    'Master', 'Synthetic major', null, '2026-10-01', null, 'Check',
    'Synthetic note', 'Synthetic note', 'Synthetic note'
  );
  if replay.case_id <> submitted.case_id or replay.replayed is not true then
    raise exception 'idempotent retry did not return the original row';
  end if;
  if (select count(*) from public.hall_cases_master where source = 'submission_user') <> 1 then
    raise exception 'idempotent retry created a duplicate row';
  end if;

  begin
    perform * from public.submit_hall_case(
      repeat('a',64), repeat('b',64), repeat('d',64), 'Changed payload', '北京',
      'Master', 'Synthetic major', null, '2026-10-01', null, 'Check',
      null, null, null
    );
    raise exception 'reused idempotency key with changed fingerprint was accepted';
  exception when sqlstate '22023' then
    null;
  end;
end
$$;

do $$
declare
  submitted record;
  reviewed record;
begin
  select * into submitted from public.submit_hall_case(
    repeat('e',64), repeat('f',64), repeat('1',64), 'Reject fixture', '上海',
    'Bachelor', 'Synthetic major 2', null, '2026-10-02', null, 'Check', null, null, null
  );
  select * into reviewed from public.review_hall_master_submission(
    submitted.case_id, 'rejected', 'Synthetic rejection', 'phase4c-admin'
  );
  if reviewed.visibility <> 'rejected' or reviewed.published_at is not null
     or reviewed.reviewed_at is null or reviewed.reviewed_by <> 'phase4c-admin' then
    raise exception 'reject review produced invalid state/metadata';
  end if;
  if exists (select 1 from public.review_hall_master_submission(submitted.case_id, 'published', null, 'phase4c-admin')) then
    raise exception 'repeated review unexpectedly updated rejected case';
  end if;

  select * into submitted from public.submit_hall_case(
    repeat('2',64), repeat('3',64), repeat('4',64), 'Publish fixture', '广州',
    'PhD', 'Synthetic major 3', null, '2026-10-03', null, 'Check', null, null, null
  );
  select * into reviewed from public.review_hall_master_submission(
    submitted.case_id, 'published', 'Synthetic approval', 'phase4c-admin'
  );
  if reviewed.visibility <> 'published' or reviewed.published_at is null
     or reviewed.reviewed_at is null then
    raise exception 'publish review produced invalid state/metadata';
  end if;
end
$$;

select 'rpc_smoke_ok' as result;
