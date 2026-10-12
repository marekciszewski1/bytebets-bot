-- ByteBets community bot: play-money balances, stats, and bet history.
-- Run in Supabase SQL Editor (or via Supabase CLI) before deploying the bot.

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null unique,
  discord_username text not null default '',
  balance bigint not null default 1000 check (balance >= 0),
  total_wagered bigint not null default 0 check (total_wagered >= 0),
  total_profit bigint not null default 0,
  last_daily_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  game text not null,
  wager bigint not null check (wager > 0),
  payout bigint not null default 0 check (payout >= 0),
  profit bigint not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists bets_player_id_created_at_idx
  on public.bets (player_id, created_at desc);

create index if not exists players_total_wagered_idx
  on public.players (total_wagered desc);

create index if not exists players_total_profit_idx
  on public.players (total_profit desc);

-- Service role only (bot backend). Do not expose these tables to anon/authenticated clients without RLS policies you design yourself.
alter table public.players enable row level security;
alter table public.bets enable row level security;

create or replace function public.touch_player_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists players_updated_at on public.players;
create trigger players_updated_at
  before update on public.players
  for each row
  execute function public.touch_player_updated_at();

create or replace function public.ensure_player(
  p_discord_id text,
  p_discord_username text
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.players;
begin
  insert into public.players (discord_id, discord_username)
  values (p_discord_id, coalesce(p_discord_username, ''))
  on conflict (discord_id) do update
    set discord_username = excluded.discord_username
  returning * into row;

  return row;
end;
$$;

create or replace function public.claim_daily(
  p_discord_id text,
  p_discord_username text,
  p_amount bigint default 500
)
returns table (new_balance bigint, next_claim_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  pl public.players;
  cooldown interval := interval '24 hours';
begin
  pl := public.ensure_player(p_discord_id, p_discord_username);

  if pl.last_daily_at is not null and pl.last_daily_at > now() - cooldown then
    raise exception 'daily_not_ready';
  end if;

  update public.players
  set
    balance = balance + p_amount,
    last_daily_at = now()
  where id = pl.id
  returning balance into new_balance;

  next_claim_at := now() + cooldown;
  return next;
end;
$$;

create or replace function public.record_bet(
  p_discord_id text,
  p_discord_username text,
  p_game text,
  p_wager bigint,
  p_payout bigint,
  p_metadata jsonb default '{}'
)
returns table (new_balance bigint, profit bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  pl public.players;
  v_profit bigint;
begin
  if p_wager <= 0 then
    raise exception 'invalid_wager';
  end if;

  pl := public.ensure_player(p_discord_id, p_discord_username);

  if pl.balance < p_wager then
    raise exception 'insufficient_balance';
  end if;

  v_profit := p_payout - p_wager;

  update public.players
  set
    balance = balance - p_wager + p_payout,
    total_wagered = total_wagered + p_wager,
    total_profit = total_profit + v_profit
  where id = pl.id
  returning balance into new_balance;

  insert into public.bets (player_id, game, wager, payout, profit, metadata)
  values (pl.id, p_game, p_wager, p_payout, v_profit, coalesce(p_metadata, '{}'));

  profit := v_profit;
  return next;
end;
$$;
