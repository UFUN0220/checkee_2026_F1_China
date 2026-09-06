alter table public.case_submissions
  add column if not exists source text not null default 'submission',
  add column if not exists visibility text not null default 'pending';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'case_submissions_source_check'
      and conrelid = 'public.case_submissions'::regclass
  ) then
    alter table public.case_submissions
      add constraint case_submissions_source_check
      check (source = any (array['legacy'::text, 'submission'::text]));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'case_submissions_visibility_check'
      and conrelid = 'public.case_submissions'::regclass
  ) then
    alter table public.case_submissions
      add constraint case_submissions_visibility_check
      check (visibility = any (array['draft'::text, 'pending'::text, 'published'::text, 'rejected'::text]));
  end if;
end
$$;
