-- Tabarname — schéma initial
-- Tables, enums, RLS, vue turns_public, publication realtime.
-- Toute la logique d'écriture autoritaire passera par des fonctions plpgsql
-- (migration 0002) appelées depuis Next.js avec la service role.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type room_status as enum (
  'lobby',
  'in_progress',
  'finished',
  'abandoned'
);

create type room_mode as enum (
  'online_premium',   -- chaque joueur Premium lit l'audio dans son navigateur
  'host_audio'        -- seul l'hôte lit l'audio (jeu en personne)
);

create type turn_phase as enum (
  'turn_playing',
  'guess_window',
  'challenge_window',
  'reveal',
  'resolved'
);

create type turn_outcome as enum (
  'active_correct',
  'challenger_correct',
  'all_wrong'
);

-- ---------------------------------------------------------------------------
-- Joueurs (1:1 avec auth.users, anonymes ou non)
-- ---------------------------------------------------------------------------
create table players (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Playlists curées
-- ---------------------------------------------------------------------------
create table curated_playlists (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  cover_url text,
  spotify_playlist_id text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table curated_tracks (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references curated_playlists(id) on delete cascade,
  spotify_track_id text not null,
  spotify_uri text not null,
  title text not null,
  artists text not null,
  album text,
  cover_url text,
  spotify_release_year smallint not null,
  effective_year smallint not null,  -- corrigeable par le curateur
  notes text,
  is_excluded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (playlist_id, spotify_track_id)
);

create index on curated_tracks (playlist_id) where is_excluded = false;

-- ---------------------------------------------------------------------------
-- Salles
-- ---------------------------------------------------------------------------
create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_player_id uuid not null references players(id),
  playlist_id uuid not null references curated_playlists(id),
  status room_status not null default 'lobby',
  mode room_mode not null default 'online_premium',
  win_condition_cards smallint not null default 10,
  current_turn_id uuid,  -- FK ajoutée plus bas (cycle)
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index on rooms (status) where status in ('lobby', 'in_progress');

create table room_players (
  room_id uuid not null references rooms(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  pseudo text not null,
  turn_order smallint,
  is_connected boolean not null default true,
  has_premium boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_id, player_id)
);

create index on room_players (player_id);

-- ---------------------------------------------------------------------------
-- Tours
-- ---------------------------------------------------------------------------
create table turns (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  turn_number int not null,
  active_player_id uuid not null references players(id),
  track_id uuid not null references curated_tracks(id),
  phase turn_phase not null default 'turn_playing',
  phase_changed_at timestamptz not null default now(),
  guess_position smallint,         -- index où l'actif veut placer la carte
  outcome turn_outcome,
  resolved_at timestamptz,
  unique (room_id, turn_number)
);

create index on turns (room_id);

alter table rooms
  add constraint rooms_current_turn_fk
  foreign key (current_turn_id) references turns(id) on delete set null;

create table challenges (
  id uuid primary key default gen_random_uuid(),
  turn_id uuid not null references turns(id) on delete cascade,
  challenger_id uuid not null references players(id),
  proposed_position smallint not null,
  created_at timestamptz not null default now(),
  unique (turn_id, challenger_id)
);

create index on challenges (turn_id);

-- ---------------------------------------------------------------------------
-- Timelines
-- ---------------------------------------------------------------------------
create table timeline_cards (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  player_id uuid not null references players(id),
  track_id uuid not null references curated_tracks(id),
  effective_year smallint not null,  -- dénormalisé pour éviter joins répétées
  acquired_at timestamptz not null default now(),
  unique (room_id, player_id, track_id)
);

create index on timeline_cards (room_id, player_id);

-- ---------------------------------------------------------------------------
-- Tokens Spotify (service role uniquement)
-- ---------------------------------------------------------------------------
create table spotify_tokens (
  player_id uuid primary key references players(id) on delete cascade,
  encrypted_access_token text not null,
  access_token_iv text not null,
  encrypted_refresh_token text not null,
  refresh_token_iv text not null,
  access_token_expires_at timestamptz not null,
  scope text not null,
  product text not null,   -- 'premium' | 'free' | 'open'
  spotify_user_id text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Journal d'événements (append-only, debug/replay)
-- ---------------------------------------------------------------------------
create table game_events (
  id bigserial primary key,
  room_id uuid not null references rooms(id) on delete cascade,
  turn_id uuid references turns(id) on delete set null,
  actor_player_id uuid references players(id),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index on game_events (room_id, created_at);

-- ---------------------------------------------------------------------------
-- Vue publique pour les tours — masque track_id et année hors reveal
-- ---------------------------------------------------------------------------
create view turns_public
with (security_invoker = true)
as
select
  t.id,
  t.room_id,
  t.turn_number,
  t.active_player_id,
  t.phase,
  t.phase_changed_at,
  t.guess_position,
  t.outcome,
  t.resolved_at,
  case when t.phase in ('reveal', 'resolved') then t.track_id end as track_id,
  case when t.phase in ('reveal', 'resolved') then ct.title end as title,
  case when t.phase in ('reveal', 'resolved') then ct.artists end as artists,
  case when t.phase in ('reveal', 'resolved') then ct.cover_url end as cover_url,
  case when t.phase in ('reveal', 'resolved') then ct.effective_year end as effective_year,
  case when t.phase in ('reveal', 'resolved') then ct.spotify_uri end as spotify_uri
from turns t
join curated_tracks ct on ct.id = t.track_id;

-- ---------------------------------------------------------------------------
-- Helper: appartenance à une salle (réutilisé partout)
-- ---------------------------------------------------------------------------
create or replace function is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from room_players
    where room_id = p_room_id and player_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table players enable row level security;
alter table curated_playlists enable row level security;
alter table curated_tracks enable row level security;
alter table rooms enable row level security;
alter table room_players enable row level security;
alter table turns enable row level security;
alter table challenges enable row level security;
alter table timeline_cards enable row level security;
alter table spotify_tokens enable row level security;
alter table game_events enable row level security;

-- players: chacun lit/écrit son propre row
create policy players_self_read on players
  for select using (id = auth.uid());
create policy players_self_upsert on players
  for insert with check (id = auth.uid());
create policy players_self_update on players
  for update using (id = auth.uid());

-- curated_playlists: lecture publique des actives
create policy playlists_public_read on curated_playlists
  for select using (is_active = true);

-- curated_tracks: lecture publique pour les playlists actives, MAIS pas
-- exposée au client en jeu — c'est turns_public qui sert les infos d'un tour.
-- On laisse la lecture ouverte pour le browsing de playlist en lobby.
create policy tracks_public_read on curated_tracks
  for select using (
    is_excluded = false
    and exists (
      select 1 from curated_playlists p
      where p.id = curated_tracks.playlist_id and p.is_active = true
    )
  );

-- rooms: visibles par leurs membres
create policy rooms_member_read on rooms
  for select using (is_room_member(id));

-- room_players: visibles par les membres de la salle
create policy room_players_member_read on room_players
  for select using (is_room_member(room_id));

-- turns: AUCUN accès direct au client. Tout passe par turns_public.
-- (pas de policy SELECT → tout est refusé pour anon/authenticated)

-- challenges: visibles par les membres de la salle
create policy challenges_member_read on challenges
  for select using (
    exists (
      select 1 from turns t
      where t.id = challenges.turn_id and is_room_member(t.room_id)
    )
  );

-- timeline_cards: visibles par les membres de la salle
create policy timeline_cards_member_read on timeline_cards
  for select using (is_room_member(room_id));

-- spotify_tokens: aucun accès anon/authenticated. Service role seulement.
-- (pas de policy → tout refusé sauf bypass service_role)

-- game_events: lecture par membres
create policy game_events_member_read on game_events
  for select using (is_room_member(room_id));

-- ---------------------------------------------------------------------------
-- Publication Realtime
-- ---------------------------------------------------------------------------
-- Les changements broadcastés au canal `room:{id}` doivent passer par la vue
-- turns_public, mais Realtime n'écoute que des tables physiques. On publie
-- donc les tables, et la RLS de la vue côté lecture protège l'année.
-- Pour turns spécifiquement: pas dans la publication (le client ne doit jamais
-- recevoir track_id brut). On émet à la place via game_events ou via une
-- mise à jour redondante de turns_public côté serveur.
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table room_players;
alter publication supabase_realtime add table challenges;
alter publication supabase_realtime add table timeline_cards;
alter publication supabase_realtime add table game_events;
