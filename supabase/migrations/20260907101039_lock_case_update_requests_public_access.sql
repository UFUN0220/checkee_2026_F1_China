create policy "deny_public_case_update_requests"
on public.case_update_requests
as restrictive
for all
to anon, authenticated
using (false)
with check (false);
