-- Restrict case analysis and notes to the case owner, explicitly assigned advisor, or admin.
-- Deliberately do not grant UPDATE/DELETE; case notes and analyses remain append-only
-- to authenticated application users until an audited editing workflow exists.
begin;

alter table public.case_analysis enable row level security;
alter table public.case_notes enable row level security;

drop policy if exists case_analysis_visible_to_case_participants on public.case_analysis;
create policy case_analysis_visible_to_case_participants
on public.case_analysis
for select
to authenticated
using (
  exists (
    select 1
    from public.assistance_cases c
    where c.id = case_analysis.case_id
      and (
        c.user_id = (select auth.uid())
        or exists (
          select 1 from public.case_assignments ca
          where ca.case_id = c.id and ca.advisor_id = (select auth.uid())
        )
        or public.has_role((select auth.uid()), 'admin'::public.app_role)
      )
  )
);

drop policy if exists case_analysis_insert_by_case_participant on public.case_analysis;
create policy case_analysis_insert_by_case_participant
on public.case_analysis
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1
    from public.assistance_cases c
    where c.id = case_analysis.case_id
      and (
        c.user_id = (select auth.uid())
        or exists (
          select 1 from public.case_assignments ca
          where ca.case_id = c.id and ca.advisor_id = (select auth.uid())
        )
        or public.has_role((select auth.uid()), 'admin'::public.app_role)
      )
  )
);

drop policy if exists case_notes_visible_to_case_participants on public.case_notes;
create policy case_notes_visible_to_case_participants
on public.case_notes
for select
to authenticated
using (
  exists (
    select 1
    from public.assistance_cases c
    where c.id = case_notes.case_id
      and (
        c.user_id = (select auth.uid())
        or exists (
          select 1 from public.case_assignments ca
          where ca.case_id = c.id and ca.advisor_id = (select auth.uid())
        )
        or public.has_role((select auth.uid()), 'admin'::public.app_role)
      )
  )
);

drop policy if exists case_notes_insert_by_case_participant on public.case_notes;
create policy case_notes_insert_by_case_participant
on public.case_notes
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and exists (
    select 1
    from public.assistance_cases c
    where c.id = case_notes.case_id
      and (
        c.user_id = (select auth.uid())
        or exists (
          select 1 from public.case_assignments ca
          where ca.case_id = c.id and ca.advisor_id = (select auth.uid())
        )
        or public.has_role((select auth.uid()), 'admin'::public.app_role)
      )
  )
);

commit;
