-- Core Ikarvo schema. Every table is owner-scoped with RLS.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free','pro')),
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles: read own" on public.profiles for select to authenticated using (id = auth.uid());
-- No client update policy: plan/customer are only written by the Stripe webhook (service role).

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

-- Generic owner-scoped document tables used by the workspace.
do $$
declare t text;
begin
  foreach t in array array['projects','campaigns','posts','listings'] loop

    execute format($f$
      create table if not exists public.%1$I (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
        title text not null default '',
        data jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      create index if not exists %1$s_user_updated on public.%1$I (user_id, updated_at desc);
      alter table public.%1$I enable row level security;
      create policy "%1$s: owner select" on public.%1$I for select to authenticated using (user_id = auth.uid());
      create policy "%1$s: owner insert" on public.%1$I for insert to authenticated with check (user_id = auth.uid());
      create policy "%1$s: owner update" on public.%1$I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
      create policy "%1$s: owner delete" on public.%1$I for delete to authenticated using (user_id = auth.uid());
      create trigger %1$s_touch before update on public.%1$I for each row execute function public.touch_updated_at();
    $f$, t);
  end loop;
end $$;
