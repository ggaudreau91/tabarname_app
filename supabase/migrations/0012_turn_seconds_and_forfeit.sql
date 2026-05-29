-- 0011 — Temps par tour configurable + forfait sur timeout.
--
-- 1. Colonne rooms.turn_seconds (durée de la phase de jeu, défaut 30).
-- 2. create_room / create_local_room acceptent p_turn_seconds.
-- 3. forfeit_turn(): clôt un tour SANS placement (timeout) → outcome 'all_wrong',
--    pour que le reveal s'affiche et qu'on puisse passer au tour suivant.
--    (resolve_turn exige un guess_position, d'où ce chemin dédié.)

-- ---------------------------------------------------------------------------
-- 1. Colonne turn_seconds
-- ---------------------------------------------------------------------------
alter table rooms
  add column if not exists turn_seconds smallint not null default 30;

-- ---------------------------------------------------------------------------
-- 2a. create_room — ajoute p_turn_seconds (drop ancienne signature 5-args)
-- ---------------------------------------------------------------------------
drop function if exists create_room(uuid, uuid, room_mode, smallint, boolean);

create or replace function create_room(
  p_host_id uuid,
  p_playlist_id uuid,
  p_mode room_mode default 'online_premium',
  p_win_cards smallint default 10,
  p_challenges_enabled boolean default true,
  p_turn_seconds smallint default 30
) returns rooms
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_room rooms;
begin
  insert into players (id) values (p_host_id) on conflict (id) do nothing;

  insert into rooms (
    code, host_player_id, playlist_id, mode, win_condition_cards,
    challenges_enabled, turn_seconds
  ) values (
    generate_room_code(), p_host_id, p_playlist_id, p_mode, p_win_cards,
    p_challenges_enabled, p_turn_seconds
  )
  returning * into v_room;

  return v_room;
end;
$$;

revoke execute on function create_room(uuid, uuid, room_mode, smallint, boolean, smallint) from public;

-- ---------------------------------------------------------------------------
-- 2b. create_local_room — ajoute p_turn_seconds (drop ancienne signature 4-args)
-- ---------------------------------------------------------------------------
drop function if exists create_local_room(uuid, uuid, text[], smallint);

create or replace function create_local_room(
  p_auth_id uuid,
  p_playlist_id uuid,
  p_pseudos text[],
  p_win_cards smallint default 10,
  p_turn_seconds smallint default 30
) returns rooms
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_room rooms;
  v_pseudo text;
  v_player_id uuid;
  v_player_ids uuid[] := '{}';
  v_first_player_id uuid;
  i int;
begin
  if array_length(p_pseudos, 1) is null or array_length(p_pseudos, 1) < 2 then
    raise exception 'need_at_least_two_players' using errcode = 'P0004';
  end if;

  foreach v_pseudo in array p_pseudos loop
    insert into players (id, display_name, auth_id)
    values (gen_random_uuid(), v_pseudo, p_auth_id)
    returning id into v_player_id;
    v_player_ids := array_append(v_player_ids, v_player_id);
  end loop;

  v_first_player_id := v_player_ids[1];

  insert into rooms (
    code, host_player_id, playlist_id, mode, win_condition_cards,
    challenges_enabled, turn_seconds
  )
  values (
    generate_room_code(), v_first_player_id, p_playlist_id, 'local_pass',
    p_win_cards, false, p_turn_seconds
  )
  returning * into v_room;

  for i in 1..array_length(v_player_ids, 1) loop
    insert into room_players (room_id, player_id, pseudo, turn_order, has_premium, is_connected)
    values (
      v_room.id,
      v_player_ids[i],
      p_pseudos[i],
      (i - 1)::smallint,
      true,
      true
    );
  end loop;

  return v_room;
end;
$$;

revoke execute on function create_local_room(uuid, uuid, text[], smallint, smallint) from public;

-- ---------------------------------------------------------------------------
-- 3. forfeit_turn — timeout sans placement → tour raté (all_wrong), résolu.
-- ---------------------------------------------------------------------------
create or replace function forfeit_turn(p_turn_id uuid)
returns turns
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_turn turns;
  v_track curated_tracks;
begin
  select * into v_turn from turns where id = p_turn_id for update;
  if not found then raise exception 'turn_not_found' using errcode = 'P0005'; end if;

  -- Idempotence: si un autre client a déjà résolu/avancé, ne rien faire.
  if v_turn.phase = 'resolved' then
    return v_turn;
  end if;
  if v_turn.phase not in ('turn_playing', 'guess_window') then
    raise exception 'wrong_phase' using errcode = 'P0007';
  end if;

  select * into v_track from curated_tracks where id = v_turn.track_id;

  update turns
    set phase = 'resolved',
        outcome = 'all_wrong',
        phase_changed_at = now(),
        resolved_at = now()
    where id = p_turn_id
    returning * into v_turn;

  insert into game_events (room_id, turn_id, actor_player_id, event_type, payload)
  values (v_turn.room_id, v_turn.id, null, 'turn_resolved',
          jsonb_build_object(
            'outcome', 'all_wrong',
            'winner_id', null,
            'position', null,
            'true_year', v_track.effective_year,
            'track_id', v_track.id,
            'timeout', true
          ));

  return v_turn;
end;
$$;

revoke execute on function forfeit_turn(uuid) from public;

notify pgrst, 'reload schema';
