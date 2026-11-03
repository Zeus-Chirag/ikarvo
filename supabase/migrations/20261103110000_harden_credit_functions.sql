-- Users can call these RPCs directly with their own JWT, so the database must not trust client-supplied numbers.
-- spend_credits: allowance is capped by the plan stored in profiles (only the billing webhook writes it).
-- refund_credits: only refunds a matching, unrefunded spend from the last 15 minutes.
create or replace function public.spend_credits(p_action text, p_cost integer, p_allowance integer)
 returns table(allowed boolean, used integer) language plpgsql security definer set search_path to '' as $f$
declare v_uid uuid := auth.uid(); v_used integer; v_plan text; v_cap integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_cost < 0 or p_cost > 1000 then raise exception 'Invalid cost'; end if;
  select coalesce(p.plan,'free') into v_plan from public.profiles p where p.id = v_uid;
  v_cap := case when v_plan = 'pro' then 1000 else 150 end;
  perform pg_advisory_xact_lock(hashtext(v_uid::text));
  select coalesce(sum(cost), 0) into v_used from public.credit_events where user_id = v_uid and created_at >= date_trunc('month', now());
  if v_used + p_cost > least(p_allowance, v_cap) then return query select false, v_used; return; end if;
  insert into public.credit_events (user_id, action, cost) values (v_uid, p_action, p_cost);
  return query select true, v_used + p_cost;
end; $f$;

create or replace function public.refund_credits(p_action text, p_cost integer)
 returns void language plpgsql security definer set search_path to '' as $f$
declare v_uid uuid := auth.uid(); v_spent integer; v_refunded integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_cost < 0 or p_cost > 1000 then raise exception 'Invalid cost'; end if;
  perform pg_advisory_xact_lock(hashtext(v_uid::text));
  select count(*) into v_spent from public.credit_events where user_id = v_uid and action = p_action and cost = p_cost and created_at >= now() - interval '15 minutes';
  select count(*) into v_refunded from public.credit_events where user_id = v_uid and action = 'refund:' || p_action and cost = -p_cost and created_at >= now() - interval '15 minutes';
  if v_spent <= v_refunded then return; end if;
  insert into public.credit_events (user_id, action, cost) values (v_uid, 'refund:' || p_action, -p_cost);
end; $f$;
revoke execute on function public.spend_credits(text,integer,integer) from anon, public;
revoke execute on function public.refund_credits(text,integer) from anon, public;
grant execute on function public.spend_credits(text,integer,integer) to authenticated;
grant execute on function public.refund_credits(text,integer) to authenticated;
