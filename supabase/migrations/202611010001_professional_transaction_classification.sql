-- Classification explicite des opérations et modèles de récurrence professionnels.
-- À exécuter dans Supabase SQL Editor avant d'utiliser la nouvelle interface.
alter table public.transactions
  add column if not exists professional_category text
    check (professional_category is null or professional_category in ('provision','vat','social')),
  add column if not exists professional_treatment text
    check (professional_treatment is null or professional_treatment in ('provision','effective')),
  add column if not exists professional_amount numeric;

alter table public.recurring_templates
  add column if not exists professional_category text
    check (professional_category is null or professional_category in ('provision','vat','social')),
  add column if not exists professional_treatment text
    check (professional_treatment is null or professional_treatment in ('provision','effective'));

-- Existing rows remain unclassified. Reclassify legacy provisions explicitly in the UI.
-- No backfill is inferred from transaction labels.
