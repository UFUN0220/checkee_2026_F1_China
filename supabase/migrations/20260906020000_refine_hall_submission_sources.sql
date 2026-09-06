update public.case_submissions
set source = case source
  when 'legacy' then 'legacy_excel'
  when 'submission' then 'submission_user'
  else source
end
where source in ('legacy', 'submission');

alter table public.case_submissions
  drop constraint if exists case_submissions_source_check;

alter table public.case_submissions
  add constraint case_submissions_source_check
  check (source = any (array['legacy_excel'::text, 'submission_user'::text, 'admin_import'::text]));

alter table public.case_submissions
  alter column source set default 'submission_user';
