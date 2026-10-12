-- ByteBits P1: lobby UX, mines persistence, VIP cosmetics, daily challenges, admin audit.

alter table public.players
  add column if not exists equipped_frame text not null default 'default',
  add column if not exists equipped_badge text not null default 'none',
  add column if not exists challenge_day date,
  add column if not exists challenge_id text,
  add column if not exists challenge_progress bigint not null default 0 check (challenge_progress >= 0),
  add column if not exists challenge_completed boolean not null default false,
  add column if not exists challenge_claimed boolean not null default false;

create table if not exists public.mines_sessions (
  id uuid primary key,
  discord_id text not null,
  wager bigint not null check (wager > 0),
  mine_count int not null check (mine_count between 1 and 24),
  mine_positions int[] not null,
  revealed int[] not null default '{}',
  nonce bigint not null,
  client_seed text not null,
  server_seed_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists mines_sessions_one_active_per_player_idx
  on public.mines_sessions (discord_id)
  where active = true;

create index if not exists mines_sessions_active_idx
  on public.mines_sessions (active, updated_at desc);

alter table public.mines_sessions enable row level security;

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_discord_id text not null,
  action text not null,
  target_discord_id text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.admin_actions enable row level security;

create or replace function public.touch_mines_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mines_sessions_updated_at on public.mines_sessions;
create trigger mines_sessions_updated_at
  before update on public.mines_sessions
  for each row
  execute function public.touch_mines_updated_at();

create or replace function public.admin_grant_credits(
  p_target_discord_id text,
  p_target_username text,
  p_amount bigint,
  p_reason text default 'admin_grant'
)
returns table (new_balance bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  pl public.players;
begin
  if p_amount <= 0 or p_amount > 1000000 then
    raise exception 'invalid_grant_amount';
  end if;

  pl := public.ensure_player(p_target_discord_id, coalesce(p_target_username, ''));

  update public.players
  set balance = balance + p_amount
  where id = pl.id
  returning balance into new_balance;

  return next;
end;
$$;

create or replace function public.claim_challenge_reward(
  p_discord_id text,
  p_discord_username text,
  p_reward bigint default 250
)
returns table (new_balance bigint, claimed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  pl public.players;
begin
  pl := public.ensure_player(p_discord_id, p_discord_username);

  if pl.challenge_completed is not true then
    raise exception 'challenge_not_complete';
  end if;

  if pl.challenge_claimed is true then
    claimed := false;
    new_balance := pl.balance;
    return next;
  end if;

  update public.players
  set
    balance = balance + p_reward,
    challenge_claimed = true
  where id = pl.id
  returning balance into new_balance;

  claimed := true;
  return next;
end;
$$;
