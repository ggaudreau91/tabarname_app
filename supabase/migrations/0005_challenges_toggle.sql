-- 0005 — Option "Contestations On/Off" + signature de create_room mise à jour.
--
-- Default = true (comportement actuel préservé pour les salles existantes).
-- Quand false: add_challenge lève une erreur, et resolve_turn n'évalue pas
-- les challengers (en pratique aucun n'existe puisqu'add_challenge bloque
-- en amont, mais on est defensive).

alter table rooms
  add column if not exists challenges_enabled boolean not null default true;

-- create_room — accepte p_challenges_enabled
create or replace function create_room(
  p_host_id uuid,
  p_playlist_id uuid,
  p_mode room_mode default 'online_premium',
  p_win_cards smallint default 10,
  p_challenges_enabled boolean default true
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
    code, host_player_id, playlist_id, mode, win_condition_cards, challenges_enabled
  ) values (
    generate_room_code(), p_host_id, p_playlist_id, p_mode, p_win_cards, p_challenges_enabled
  )
  returning * into v_room;

  return v_room;
end;
$$;

revoke execute on function create_room(uuid, uuid, room_mode, smallint, boolean) from public;

-- add_challenge — refuser si la salle a désactivé les contestations
create or replace function add_challenge(
  p_turn_id uuid,
  p_challenger_id uuid,
  p_position int
) returns challenges
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_turn turns;
  v_challenge challenges;
  v_is_member boolean;
  v_room rooms;
begin
  select * into v_turn from turns where id = p_turn_id for update;
  if not found then raise exception 'turn_not_found' using errcode = 'P0005'; end if;
  if v_turn.phase <> 'challenge_window' then
    raise exception 'wrong_phase' using errcode = 'P0007';
  end if;
  if v_turn.active_player_id = p_challenger_id then
    raise exception 'active_cannot_challenge' using errcode = 'P0008';
  end if;

  select * into v_room from rooms where id = v_turn.room_id;
  if not v_room.challenges_enabled then
    raise exception 'challenges_disabled' using errcode = 'P0013';
  end if;

  select exists (
    select 1 from room_players
    where room_id = v_turn.room_id and player_id = p_challenger_id
  ) into v_is_member;
  if not v_is_member then
    raise exception 'not_room_member' using errcode = 'P0009';
  end if;

  insert into challenges (turn_id, challenger_id, proposed_position)
  values (p_turn_id, p_challenger_id, p_position)
  returning * into v_challenge;

  insert into game_events (room_id, turn_id, actor_player_id, event_type, payload)
  values (v_turn.room_id, v_turn.id, p_challenger_id, 'challenge_added',
          jsonb_build_object('position', p_position));

  return v_challenge;
end;
$$;
