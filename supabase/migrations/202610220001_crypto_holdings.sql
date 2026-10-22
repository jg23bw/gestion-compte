-- Gestion de comptes : positions crypto synchronisées par utilisateur.
-- À exécuter dans Supabase > SQL Editor sur le projet utilisé par l'application.
-- Migration incrémentale et idempotente : elle ne touche pas aux autres tables.
create table if not exists public.crypto_holdings (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null check (char_length(symbol) between 1 and 12),
  name text not null default '',
  coingecko_id text not null,
  status text not null default 'Détenu',
  invested numeric(14,2) not null default 0 check (invested >= 0),
  quantity numeric(24,8) not null default 0 check (quantity >= 0),
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists crypto_holdings_user_order_idx
  on public.crypto_holdings(user_id, sort_order);

-- RLS : chaque utilisateur ne lit et ne modifie que ses propres positions.
alter table public.crypto_holdings enable row level security;

drop policy if exists "crypto holdings own rows" on public.crypto_holdings;
create policy "crypto holdings own rows" on public.crypto_holdings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Défense en profondeur : aucun privilège pour les clients non authentifiés.
revoke all on table public.crypto_holdings from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.crypto_holdings to authenticated;

notify pgrst, 'reload schema';
