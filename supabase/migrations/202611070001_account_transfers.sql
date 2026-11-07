-- Virements entre comptes : deux écritures liées, un débit et un crédit.
-- À exécuter dans Supabase > SQL Editor avant d'enregistrer le premier virement.
alter table public.transactions
  add column if not exists transfer_id text,
  add column if not exists transfer_role text,
  add column if not exists transfer_account_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_transfer_shape_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_transfer_shape_check check (
        (transfer_id is null and transfer_role is null and transfer_account_id is null)
        or (transfer_id is not null and transfer_role in ('outgoing', 'incoming') and transfer_account_id is not null)
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_transfer_account_fk'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_transfer_account_fk
      foreign key (user_id, transfer_account_id)
      references public.accounts(user_id, id) on delete cascade;
  end if;
end $$;

create unique index if not exists transactions_user_transfer_role_uidx
  on public.transactions(user_id, transfer_id, transfer_role)
  where transfer_id is not null;

notify pgrst, 'reload schema';
