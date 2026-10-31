-- Growth workspace: brand briefs, articles, AI-visibility runs, community threads. Owner-scoped RLS.
do $$
declare t text;
begin
  foreach t in array array['brands','articles','visibility','threads'] loop
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
