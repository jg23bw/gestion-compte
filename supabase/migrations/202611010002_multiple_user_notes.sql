-- Convertit l'ancienne note unique en collection de notes par utilisateur.
-- Le contenu existant est conservé ; l'identifiant UUID est ajouté à la ligne existante.
alter table public.user_notes add column if not exists id uuid;
update public.user_notes set id=gen_random_uuid() where id is null;
alter table public.user_notes alter column id set default gen_random_uuid();
alter table public.user_notes alter column id set not null;
alter table public.user_notes add column if not exists title text not null default 'Ma première note';
alter table public.user_notes add column if not exists created_at timestamptz not null default now();

do $$
declare pk_name text;
begin
  select conname into pk_name
  from pg_constraint
  where conrelid='public.user_notes'::regclass and contype='p';
  if pk_name is not null then
    execute format('alter table public.user_notes drop constraint %I',pk_name);
  end if;
end $$;
alter table public.user_notes add constraint user_notes_pkey primary key (id);
create index if not exists user_notes_user_updated_idx on public.user_notes(user_id,updated_at desc);

alter table public.user_notes enable row level security;
drop policy if exists "user notes own rows" on public.user_notes;
create policy "user notes own rows" on public.user_notes for all to authenticated
  using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
revoke all on table public.user_notes from anon, authenticated;
grant usage on schema public to authenticated;
grant select,insert,update,delete on public.user_notes to authenticated;
notify pgrst, 'reload schema';
