-- ByteBits P3: immutable rounds, PvP/house coinflip matches, escrow journal.

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  opaque_id text not null unique,
  guild_id text,
  game text not null,
  paytable_version text not null default 'v1',
  proof_status text not null default 'committed',
  server_seed_hash text not null,
  server_seed text,
  client_seed_a text not null default '',
  client_seed_b text not null default '',
  nonce bigint not null default 0,
  outcome jsonb not null default '{}',
  stake_sc bigint not null default 0,
  payout_sc bigint not null default 0,
  fee_sc bigint not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create index if not exists rounds_settled_at_idx on public.rounds (settled_at desc);
alter table public.rounds enable row level security;

create table if not exists public.coinflip_matches (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  guild_id text not null,
  creator_id text not null,
  opponent_id text,
  mode text not null check (mode in ('pvp', 'house')),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  creator_side text not null check (creator_side in ('heads', 'tails')),
  stake_sc bigint not null check (stake_sc > 0 and stake_sc % 10 = 0),
  fee_sc bigint not null default 0,
  pot_sc bigint not null default 0,
  winning_return_sc bigint not null default 0,
  state text not null default 'OPEN',
  seed_hash text not null,
  server_seed text,
  client_seed_a text not null default '',
  client_seed_b text not null default '',
  nonce bigint not null default 0,
  round_id uuid references public.rounds (id),
  winner_id text,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  settled_at timestamptz,
  interaction_message_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coinflip_matches_state_check check (
    state in ('OPEN', 'ACCEPTED', 'ANIMATING', 'SETTLED', 'EXPIRED', 'CANCELLED', 'VOIDED')
  )
);

create index if not exists coinflip_matches_guild_state_idx
  on public.coinflip_matches (guild_id, state, created_at desc);

create unique index if not exists coinflip_matches_one_open_creator_idx
  on public.coinflip_matches (creator_id)
  where state in ('OPEN', 'ACCEPTED', 'ANIMATING');

alter table public.coinflip_matches enable row level security;

create table if not exists public.escrow_journal (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.coinflip_matches (id) on delete cascade,
  round_id uuid references public.rounds (id) on delete set null,
  discord_id text not null,
  amount_sc bigint not null,
  entry_type text not null check (entry_type in ('lock', 'refund', 'payout', 'fee_sink')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

alter table public.escrow_journal enable row level security;

create or replace function public.coinflip_lock_stake(
  p_discord_id text,
  p_discord_username text,
  p_amount bigint,
  p_idempotency_key text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  pl public.players;
  bal bigint;
begin
  if p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  if exists (select 1 from public.escrow_journal where idempotency_key = p_idempotency_key) then
    select balance into bal from public.players where discord_id = p_discord_id;
    return bal;
  end if;

  pl := public.ensure_player(p_discord_id, p_discord_username);
  if pl.balance < p_amount then
    raise exception 'insufficient_balance';
  end if;

  update public.players set balance = balance - p_amount where id = pl.id returning balance into bal;
  return bal;
end;
$$;

create or replace function public.coinflip_credit(
  p_discord_id text,
  p_discord_username text,
  p_amount bigint,
  p_idempotency_key text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  pl public.players;
  bal bigint;
begin
  if exists (select 1 from public.escrow_journal where idempotency_key = p_idempotency_key) then
    select balance into bal from public.players where discord_id = p_discord_id;
    return bal;
  end if;

  pl := public.ensure_player(p_discord_id, p_discord_username);
  update public.players set balance = balance + p_amount where id = pl.id returning balance into bal;
  return bal;
end;
$$;
