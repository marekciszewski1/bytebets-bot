-- ByteBits P0: provably fair commitments, player seeds/nonces, atomic bet recording.

alter table public.players
  add column if not exists client_seed text not null default '',
  add column if not exists nonce bigint not null default 0 check (nonce >= 0);

create table if not exists public.fairness_commitments (
  id uuid primary key default gen_random_uuid(),
  seed_hash text not null unique,
  server_seed text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  revealed_at timestamptz
);

create unique index if not exists fairness_commitments_one_active_idx
  on public.fairness_commitments ((active))
  where active = true;

alter table public.fairness_commitments enable row level security;

create or replace function public.set_client_seed(
  p_discord_id text,
  p_discord_username text,
  p_client_seed text
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.players;
  seed text;
begin
  seed := left(trim(coalesce(p_client_seed, '')), 64);
  if length(seed) < 1 then
    raise exception 'invalid_client_seed';
  end if;

  row := public.ensure_player(p_discord_id, p_discord_username);
  update public.players
  set client_seed = seed
  where id = row.id
  returning * into row;

  return row;
end;
$$;

create or replace function public.record_bet(
  p_discord_id text,
  p_discord_username text,
  p_game text,
  p_wager bigint,
  p_payout bigint,
  p_metadata jsonb default '{}',
  p_expected_nonce bigint default null
)
returns table (new_balance bigint, profit bigint, used_nonce bigint)
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

  if pl.client_seed = '' then
    update public.players set client_seed = p_discord_id where id = pl.id;
    pl.client_seed := p_discord_id;
  end if;

  if p_expected_nonce is not null and pl.nonce <> p_expected_nonce then
    raise exception 'nonce_mismatch';
  end if;

  if pl.balance < p_wager then
    raise exception 'insufficient_balance';
  end if;

  v_profit := p_payout - p_wager;
  used_nonce := pl.nonce;

  update public.players
  set
    balance = balance - p_wager + p_payout,
    total_wagered = total_wagered + p_wager,
    total_profit = total_profit + v_profit,
    nonce = nonce + 1
  where id = pl.id
  returning balance into new_balance;

  insert into public.bets (player_id, game, wager, payout, profit, metadata)
  values (
    pl.id,
    p_game,
    p_wager,
    p_payout,
    v_profit,
    coalesce(p_metadata, '{}') || jsonb_build_object('nonce', used_nonce)
  );

  profit := v_profit;
  return next;
end;
$$;

create or replace function public.activate_fairness_commitment(
  p_seed_hash text,
  p_server_seed text
)
returns public.fairness_commitments
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.fairness_commitments;
begin
  update public.fairness_commitments set active = false, revealed_at = now()
  where active = true;

  insert into public.fairness_commitments (seed_hash, server_seed, active)
  values (p_seed_hash, p_server_seed, true)
  returning * into row;

  return row;
end;
$$;

create or replace function public.get_active_fairness_commitment()
returns public.fairness_commitments
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.fairness_commitments;
begin
  select * into row from public.fairness_commitments where active = true limit 1;
  return row;
end;
$$;

create or replace function public.reveal_fairness_commitment(
  p_seed_hash text
)
returns public.fairness_commitments
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.fairness_commitments;
begin
  update public.fairness_commitments
  set active = false, revealed_at = coalesce(revealed_at, now())
  where seed_hash = p_seed_hash
  returning * into row;
  return row;
end;
$$;
