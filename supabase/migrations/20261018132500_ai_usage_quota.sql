-- Atomic per-user hourly quota for authenticated AI generation routes.
create table if not exists public.ai_usage_buckets (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, bucket_start)
);

alter table public.ai_usage_buckets enable row level security;
revoke all on table public.ai_usage_buckets from anon, authenticated;
create policy "No direct client access to AI usage buckets"
  on public.ai_usage_buckets for all to anon, authenticated
  using (false) with check (false);

create or replace function public.consume_ai_quota(p_hourly_limit integer default 20)
returns table(allowed boolean, used integer, resets_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_bucket_start timestamptz := date_trunc('hour', now());
  v_count integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_hourly_limit < 1 or p_hourly_limit > 100 then raise exception 'Invalid quota limit'; end if;

  insert into public.ai_usage_buckets as b (user_id, bucket_start, request_count)
  values (v_user_id, v_bucket_start, 1)
  on conflict (user_id, bucket_start) do update
    set request_count = b.request_count + 1
    where b.request_count < p_hourly_limit
  returning request_count into v_count;

  if v_count is null then
    select b.request_count into v_count from public.ai_usage_buckets as b
    where b.user_id = v_user_id and b.bucket_start = v_bucket_start;
    return query select false, coalesce(v_count, p_hourly_limit), v_bucket_start + interval '1 hour';
  else
    return query select true, v_count, v_bucket_start + interval '1 hour';
  end if;
end;
$$;

revoke all on function public.consume_ai_quota(integer) from public, anon;
grant execute on function public.consume_ai_quota(integer) to authenticated;
