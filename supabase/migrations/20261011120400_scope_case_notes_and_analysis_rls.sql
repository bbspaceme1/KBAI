-- Restrict case analysis and notes to the case owner, explicitly assigned advisor, or admin.
-- A narrowly scoped SECURITY DEFINER predicate avoids recursive RLS evaluation between
-- assistance_cases and case_assignments. It only returns whether auth.uid() can access one case.
begin;

create or replace function public.can_access_assistance_case(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select exists (
    select 1
    from public.assistance_cases c
    where c.id = p_case_id
      and (
        c.user_id = (select auth.uid())
        or exists (
          select 1
          from public.case_assignments ca
          where ca.case_id = c.id
            and ca.advisor_id = (select auth.uid())
        )
        or public.has_role((select auth.uid()), 'admin'::public.app_role)
      )
  );
$function$;

revoke all on function public.can_access_assistance_case(uuid) from public;
grant execute on function public.can_access_assistance_case(uuid) to authenticated;

alter table public.case_analysis enable row level security;
alter table public.case_notes enable row level security;

drop policy if exists case_analysis_visible_to_case_participants on public.case_analysis;
create policy case_analysis_visible_to_case_participants
on public.case_analysis
for select
to authenticated
using (public.can_access_assistance_case(case_id));

drop policy if exists case_analysis_insert_by_case_participant on public.case_analysis;
create policy case_analysis_insert_by_case_participant
on public.case_analysis
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and public.can_access_assistance_case(case_id)
);

drop policy if exists case_notes_visible_to_case_participants on public.case_notes;
create policy case_notes_visible_to_case_participants
on public.case_notes
for select
to authenticated
using (public.can_access_assistance_case(case_id));

drop policy if exists case_notes_insert_by_case_participant on public.case_notes;
create policy case_notes_insert_by_case_participant
on public.case_notes
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and public.can_access_assistance_case(case_id)
);

-- No UPDATE/DELETE policies are intentionally granted; edits/deletion require a separately
-- audited workflow. Table grants remain subject to the policies above.
commit;
