-- Explicit professional operation type, separate from expense classifications.
alter table public.transactions
  add column if not exists professional_operation_type text
    check (professional_operation_type is null or professional_operation_type in ('invoice'));
