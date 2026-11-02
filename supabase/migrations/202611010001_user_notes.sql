-- Notes personnelles : une note texte privée par utilisateur.
create table if not exists public.user_notes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now(),
  constraint user_notes_content_size check (octet_length(content) <= 1048576)
);

alter table public.user_notes enable row level security;
drop policy if exists "user notes own rows" on public.user_notes;
create policy "user notes own rows" on public.user_notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on table public.user_notes from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.user_notes to authenticated;
notify pgrst, 'reload schema';
