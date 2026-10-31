-- Credits ledger (monthly allowance, atomic spend, refunds) and user-level settings/chat tables.
create table if not exists public.credit_events (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  action text not null, cost integer not null, created_at timestamptz not null default now()
);
create index if not exists credit_events_user_time on public.credit_events (user_id, created_at desc);
alter table public.credit_events enable row level security;
create policy "read own credit events" on public.credit_events for select to authenticated using (user_id = auth.uid());

create or replace function public.spend_credits(p_action text, p_cost integer, p_allowance integer)
returns table(allowed boolean, used integer) language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_used integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_cost < 0 or p_cost > 1000 then raise exception 'Invalid cost'; end if;
  perform pg_advisory_xact_lock(hashtext(v_uid::text));
  select coalesce(sum(cost), 0) into v_used from public.credit_events where user_id = v_uid and created_at >= date_trunc('month', now());
  if v_used + p_cost > p_allowance then return query select false, v_used; return; end if;
  insert into public.credit_events (user_id, action, cost) values (v_uid, p_action, p_cost);
  return query select true, v_used + p_cost;
end; $$;
create or replace function public.refund_credits(p_action text, p_cost integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_cost < 0 or p_cost > 1000 then raise exception 'Invalid cost'; end if;
  insert into public.credit_events (user_id, action, cost) values (auth.uid(), 'refund:' || p_action, -p_cost);
end; $$;
revoke all on function public.spend_credits(text, integer, integer) from public, anon;
revoke all on function public.refund_credits(text, integer) from public, anon;
grant execute on function public.spend_credits(text, integer, integer) to authenticated;
grant execute on function public.refund_credits(text, integer) to authenticated;
-- Note: p_allowance comes from the server (plan lookup). A determined user could call the RPC directly with a
-- larger allowance; that only lets them record more usage against themselves, provider keys stay server-side.

do $$ declare t text; begin
  foreach t in array array['settings','chats','memories','skills','mcp','team','docs','ugc','hn','logs'] loop
    execute format('create table if not exists public.%I (id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade, title text not null default '''', data jsonb not null default ''{}''::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now())', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop; end $$;
