-- v9: shared workspaces (team invites grant access to the owner's documents) + private bucket for direct-to-Storage uploads.

create table if not exists public.workspace_members (
  owner_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  member_id uuid references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('admin','editor','viewer')),
  status text not null default 'invited' check (status in ('invited','active')),
  created_at timestamptz not null default now(),
  primary key (owner_id, email)
);
create index if not exists workspace_members_member on public.workspace_members (member_id);
alter table public.workspace_members enable row level security;
-- Owners see and manage their roster; members see their own memberships. Inserts/activation happen server-side (service role).
create policy "wm: owner or member read" on public.workspace_members for select to authenticated using (owner_id = auth.uid() or member_id = auth.uid());
create policy "wm: owner delete" on public.workspace_members for delete to authenticated using (owner_id = auth.uid());
create policy "wm: member leaves" on public.workspace_members for delete to authenticated using (member_id = auth.uid());

-- Access check used by every document policy. write=true excludes viewers.
create or replace function public.ws_can(p_owner uuid, p_write boolean) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_owner = auth.uid() or exists (
    select 1 from public.workspace_members m
    where m.owner_id = p_owner and m.member_id = auth.uid() and m.status = 'active' and (not p_write or m.role in ('admin','editor')));
$$;
revoke execute on function public.ws_can(uuid, boolean) from public, anon;
grant execute on function public.ws_can(uuid, boolean) to authenticated;

-- Re-point the owner-only policies of the shared document tables at ws_can. Personal tables (settings, chats, memories,
-- credits, Meta tokens, team roster) stay owner-only.
do $$
declare t text;
begin
  foreach t in array array['projects','campaigns','posts','listings','brands','articles','visibility','threads','crawls','influencers','backlinks','competitors','reports','docs','ugc','hn','logs','sequences','launches','ads','ad_projects'] loop
    execute (select coalesce(string_agg(format('drop policy if exists %I on public.%I;', policyname, t), ' '), '') from pg_policies where schemaname = 'public' and tablename = t);
    execute format($f$
      create policy "%1$s: ws select" on public.%1$I for select to authenticated using (public.ws_can(user_id, false));
      create policy "%1$s: ws insert" on public.%1$I for insert to authenticated with check (public.ws_can(user_id, true));
      create policy "%1$s: ws update" on public.%1$I for update to authenticated using (public.ws_can(user_id, true)) with check (public.ws_can(user_id, true));
      create policy "%1$s: ws delete" on public.%1$I for delete to authenticated using (public.ws_can(user_id, true));
    $f$, t);
  end loop;
end $$;

-- Private bucket; each user writes only under "<their uid>/". 50 MB matches the Supabase free-plan per-file ceiling.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media-uploads', 'media-uploads', false, 52428800, array['video/mp4','video/webm','video/quicktime','image/png','image/jpeg','image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "media-uploads: own insert" on storage.objects for insert to authenticated with check (bucket_id = 'media-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media-uploads: own select" on storage.objects for select to authenticated using (bucket_id = 'media-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media-uploads: own delete" on storage.objects for delete to authenticated using (bucket_id = 'media-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
