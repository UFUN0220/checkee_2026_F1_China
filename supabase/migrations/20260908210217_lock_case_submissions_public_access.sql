-- Public users submit through /api/submissions, which performs server-side validation
-- and writes with the server-only service role. Do not expose the table to the
-- browser-facing anon/authenticated roles.
alter table public.case_submissions enable row level security;

revoke all on table public.case_submissions from anon, authenticated;
grant select, insert, update on table public.case_submissions to service_role;
