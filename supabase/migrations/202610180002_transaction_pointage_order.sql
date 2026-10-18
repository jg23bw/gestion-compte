-- Gestion de comptes : persister le pointage et l'ordre manuel des opérations.
-- À exécuter dans Supabase > SQL Editor sur le projet utilisé par l'application.
alter table public.transactions
  add column if not exists recurring_key text,
  add column if not exists is_paid boolean not null default false,
  add column if not exists sort_order integer;

with ranked as (
  select id, row_number() over (partition by user_id, account_id order by transaction_date desc, created_at desc, id) as position
  from public.transactions
)
update public.transactions t set sort_order = ranked.position
from ranked where t.id = ranked.id and t.sort_order is null;

create unique index if not exists transactions_user_recurring_key_uidx
  on public.transactions(user_id, recurring_key) where recurring_key is not null;

notify pgrst, 'reload schema';
