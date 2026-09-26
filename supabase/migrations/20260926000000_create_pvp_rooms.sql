create table public.pvp_rooms (
  code text primary key
    check (code ~ '^[A-F0-9]{10}$'),
  revision bigint not null default 0
    check (revision >= 0),
  host_token_hash text not null
    check (host_token_hash ~ '^[a-f0-9]{64}$'),
  guest_token_hash text
    check (guest_token_hash is null or guest_token_hash ~ '^[a-f0-9]{64}$'),
  game_state jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  constraint pvp_rooms_seats_match_game_state
    check ((guest_token_hash is null) = (game_state is null))
);

create index pvp_rooms_updated_at_idx on public.pvp_rooms (updated_at);
create index pvp_rooms_expires_at_idx on public.pvp_rooms (expires_at);

alter table public.pvp_rooms enable row level security;

-- All room access goes through the authoritative Node API's database connection.
-- Do not expose room data through Supabase's Data API roles.
revoke all privileges on table public.pvp_rooms from anon, authenticated, service_role;
