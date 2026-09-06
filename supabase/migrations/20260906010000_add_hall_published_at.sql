alter table public.case_submissions
  add column if not exists published_at timestamptz;

create or replace function public.set_case_submission_published_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.visibility = 'published'
    and (tg_op = 'INSERT' or old.visibility is distinct from 'published') then
    new.published_at = current_timestamp;
  elsif new.visibility is distinct from 'published' then
    new.published_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists set_case_submission_published_at on public.case_submissions;

create trigger set_case_submission_published_at
before insert or update of visibility on public.case_submissions
for each row
execute function public.set_case_submission_published_at();
