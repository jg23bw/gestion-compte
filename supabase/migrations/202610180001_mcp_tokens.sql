-- Per-user MCP credentials. Apply once in Supabase SQL Editor.
create table if not exists public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  name text not null default 'MCP',
  default_account_id text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  foreign key (user_id, default_account_id)
    references public.accounts(user_id, id) on delete set null
);

create index if not exists mcp_tokens_user_idx on public.mcp_tokens(user_id, created_at desc);
alter table public.mcp_tokens enable row level security;
revoke all on table public.mcp_tokens from anon, authenticated;
