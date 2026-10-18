-- Gestion de comptes — schéma PostgreSQL Supabase
-- À exécuter dans Supabase > SQL Editor. Toutes les tables sont privées par utilisateur.
create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  short text not null default '',
  kind text not null check (kind in ('bank','savings','pro')),
  opening numeric(14,2) not null default 0,
  vat_rate numeric(5,2) not null default 20,
  social_rate numeric(5,2) not null default 45,
  net_opening numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id text not null,
  transaction_date date not null,
  label text not null check (char_length(label) between 1 and 120),
  amount numeric(14,2) not null,
  source text not null default 'manual' check (source in ('manual','recurring')),
  recurring_template_id text,
  generated_month text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (user_id, account_id) references public.accounts(user_id, id) on delete cascade,
  unique (user_id, recurring_template_id, generated_month, transaction_date, label)
);

create table if not exists public.recurring_templates (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id text not null,
  day_of_month smallint not null default 1 check (day_of_month between 1 and 31),
  frequency text not null check (frequency in ('monthly','quarterly','annual','once')),
  months smallint[] not null default '{}',
  start_month text,
  end_month text,
  once_date date,
  label text not null check (char_length(label) between 1 and 120),
  amount numeric(14,2),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, account_id) references public.accounts(user_id, id) on delete cascade
);

create table if not exists public.audit_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('account','transaction','recurring_template')),
  entity_id text not null,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index if not exists transactions_account_date_idx on public.transactions(user_id, account_id, transaction_date desc);
create index if not exists recurring_user_account_idx on public.recurring_templates(user_id, account_id);
create index if not exists audit_user_changed_idx on public.audit_history(user_id, changed_at desc);

-- RLS obligatoire : chaque utilisateur ne lit/modifie que ses propres données.
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_templates enable row level security;
alter table public.audit_history enable row level security;

drop policy if exists "accounts own rows" on public.accounts;
create policy "accounts own rows" on public.accounts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "transactions own rows" on public.transactions;
create policy "transactions own rows" on public.transactions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "recurring templates own rows" on public.recurring_templates;
create policy "recurring templates own rows" on public.recurring_templates for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "audit own rows read" on public.audit_history;
create policy "audit own rows read" on public.audit_history for select to authenticated
  using (user_id = (select auth.uid()));

-- Journalisation des changements sans exposer les données aux autres utilisateurs.
create or replace function public.record_gestion_history()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  row_data jsonb;
  row_user uuid;
  row_id text;
  entity text := TG_ARGV[0];
begin
  if TG_OP = 'DELETE' then row_data := to_jsonb(OLD); else row_data := to_jsonb(NEW); end if;
  row_user := (row_data->>'user_id')::uuid;
  row_id := coalesce(row_data->>'id', row_data->>'account_id', '');
  if TG_OP = 'INSERT' then
    insert into public.audit_history(user_id,entity_type,entity_id,action,new_data)
    values(row_user,entity,row_id,'INSERT',to_jsonb(NEW));
    return NEW;
  elsif TG_OP = 'UPDATE' then
    insert into public.audit_history(user_id,entity_type,entity_id,action,old_data,new_data)
    values(row_user,entity,row_id,'UPDATE',to_jsonb(OLD),to_jsonb(NEW));
    return NEW;
  else
    insert into public.audit_history(user_id,entity_type,entity_id,action,old_data)
    values(row_user,entity,row_id,'DELETE',to_jsonb(OLD));
    return OLD;
  end if;
end;
$$;

drop trigger if exists accounts_audit on public.accounts;
create trigger accounts_audit after insert or update or delete on public.accounts
for each row execute function public.record_gestion_history('account');
drop trigger if exists transactions_audit on public.transactions;
create trigger transactions_audit after insert or update or delete on public.transactions
for each row execute function public.record_gestion_history('transaction');
drop trigger if exists recurring_templates_audit on public.recurring_templates;
create trigger recurring_templates_audit after insert or update or delete on public.recurring_templates
for each row execute function public.record_gestion_history('recurring_template');


-- Required for authenticated browser clients using the Supabase Data API.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.accounts to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.recurring_templates to authenticated;
grant select on public.audit_history to authenticated;
grant usage, select on all sequences in schema public to authenticated;
