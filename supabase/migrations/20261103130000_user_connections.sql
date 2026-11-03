-- Per-user OAuth connections (GitHub, Vercel, Google). Tokens are AES-256-GCM sealed server-side
-- with SESSION_SECRET before they reach the database, and rows are visible only to their owner.
create table if not exists public.user_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('github','vercel','google')),
  sealed text not null,
  account_label text,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table public.user_connections enable row level security;
revoke all on public.user_connections from anon;
grant select, insert, update, delete on public.user_connections to authenticated;
drop policy if exists "own connections" on public.user_connections;
create policy "own connections" on public.user_connections for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
