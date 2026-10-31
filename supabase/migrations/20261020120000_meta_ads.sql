-- v8: Meta Ads (Marketing API) connection per workspace, plus an audit log of every object Ikarvo created or launched.
-- access_token is sealed server-side (AES-256-GCM with SESSION_SECRET) before it is written; it is never stored in plain text.

create table if not exists public.meta_connections (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  access_token text not null,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  meta_user_id text not null,
  meta_user_name text not null default '',
  ad_account_id text,            -- "act_123"
  ad_account_name text,
  currency text,
  page_id text,                  -- Facebook Page the ads run as
  page_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.meta_connections enable row level security;
drop policy if exists "own meta connection" on public.meta_connections;
create policy "own meta connection" on public.meta_connections for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.meta_ad_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ad_account_id text not null,
  object_type text not null check (object_type in ('campaign','adset','ad','creative','video','audience')),
  object_id text not null,
  action text not null check (action in ('created','launched','paused','resumed')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists meta_ad_events_user_idx on public.meta_ad_events (user_id, created_at desc);
alter table public.meta_ad_events enable row level security;
drop policy if exists "own meta events" on public.meta_ad_events;
create policy "own meta events" on public.meta_ad_events for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
