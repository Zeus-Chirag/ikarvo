-- v7: Ad Studio projects/renders, lifecycle sequences, launch plans (owner-scoped, RLS)

do $$ declare t text; begin
  foreach t in array array['sequences','launches','ads','ad_projects'] loop
    execute format('create table if not exists public.%I (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade, title text not null default '''', data jsonb not null default ''{}''::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now())', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop; end $$;
