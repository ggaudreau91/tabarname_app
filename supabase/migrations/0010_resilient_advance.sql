-- 0010 — advance_to_next_turn auto-resolve si possible.
--
-- Symptôme: l'utilisateur clique "Prochain tour" et reçoit
-- "previous_turn_not_resolved" parce que le tour est bloqué en
-- `challenge_window` (par ex. l'auto-resolve côté client n'a pas fini avant
-- que le user clique).
--
-- Fix: avant de raise, on tente de résoudre le tour précédent si ses
-- conditions le permettent (guess_position set + phase challenge_window).
-- C'est idempotent: si déjà résolu, no-op.

create or replace function advance_to_next_turn(p_room_id uuid)
returns turns
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_room rooms;
  v_last_turn turns;
  v_active_idx int;
  v_player_count int;
  v_next_active uuid;
  v_step int;
  v_track curated_tracks;
  v_new_turn turns;
begin
  select * into v_room from rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found' using errcode = 'P0001'; end if;
  if v_room.status <> 'in_progress' then
    return null;
  end if;

  select * into v_last_turn from turns where id = v_room.current_turn_id;
  if not found then
    raise exception 'previous_turn_not_resolved' using errcode = 'P0011';
  end if;

  -- Auto-resolve si le tour est en challenge_window mais a déjà un guess
  if v_last_turn.phase = 'challenge_window' and v_last_turn.guess_position is not null then
    perform resolve_turn(v_last_turn.id);
    select * into v_last_turn from turns where id = v_room.current_turn_id;
  end if;

  if v_last_turn.phase <> 'resolved' then
    raise exception 'previous_turn_not_resolved' using errcode = 'P0011';
  end if;

  -- La partie peut s'être terminée à la résolution
  select * into v_room from rooms where id = p_room_id;
  if v_room.status <> 'in_progress' then
    return null;
  end if;

  select turn_order into v_active_idx from room_players
    where room_id = p_room_id and player_id = v_last_turn.active_player_id;

  select count(*) into v_player_count from room_players where room_id = p_room_id;

  v_step := 1;
  loop
    select player_id into v_next_active
    from room_players
    where room_id = p_room_id
      and turn_order = ((v_active_idx + v_step) % v_player_count)
      and is_connected = true;
    exit when v_next_active is not null;
    v_step := v_step + 1;
    if v_step > v_player_count then
      raise exception 'no_connected_players' using errcode = 'P0012';
    end if;
  end loop;

  v_track := _pick_random_track(p_room_id);

  insert into turns (room_id, turn_number, active_player_id, track_id)
  values (p_room_id, v_last_turn.turn_number + 1, v_next_active, v_track.id)
  returning * into v_new_turn;

  update rooms set current_turn_id = v_new_turn.id where id = p_room_id;

  insert into game_events (room_id, turn_id, actor_player_id, event_type, payload)
  values (p_room_id, v_new_turn.id, v_next_active, 'turn_started', '{}'::jsonb);

  return v_new_turn;
end;
$$;

revoke execute on function advance_to_next_turn(uuid) from public;

notify pgrst, 'reload schema';
