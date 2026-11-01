-- Classification explicite des opérations professionnelles.
-- À exécuter dans Supabase SQL Editor avant d'utiliser la nouvelle interface.
alter table public.transactions
  add column if not exists professional_category text
    check (professional_category is null or professional_category in ('provision','vat','social')),
  add column if not exists professional_treatment text
    check (professional_treatment is null or professional_treatment in ('provision','effective')),
  add column if not exists professional_amount numeric;
update public.transactions set professional_amount = amount where professional_amount is null;
