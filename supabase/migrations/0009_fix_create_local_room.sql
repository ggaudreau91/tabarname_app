-- 0009 — Fix create_local_room qui dupliquait les joueurs.
--
-- Bug: la fonction faisait `select id from players where display_name = any(p_pseudos)`
-- ce qui matchait aussi les joueurs des CRÉATIONS PRÉCÉDENTES (puisque on
-- réutilise les mêmes pseudos d'une partie à l'autre). Résultat: 2 joueurs
-- créés × N parties précédentes = 2N joueurs ajoutés à room_players.
--
-- Fix: on collecte les ids dans un tableau au fur et à mesure des inserts,
-- puis on itère sur ce tableau pour les inscrire en gardant l'ordre.

create or replace function create_local_room(
  p_auth_id uuid,
  p_playlist_id uuid,
  p_pseudos text[],
  p_win_cards smallint default 10
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

  -- 1) Créer N joueurs virtuels et collecter leurs IDs
  foreach v_pseudo in array p_pseudos loop
    insert into players (id, display_name, auth_id)
    values (gen_random_uuid(), v_pseudo, p_auth_id)
    returning id into v_player_id;
    v_player_ids := array_append(v_player_ids, v_player_id);
  end loop;

  v_first_player_id := v_player_ids[1];

  -- 2) Créer la salle avec le premier joueur comme hôte virtuel
  insert into rooms (code, host_player_id, playlist_id, mode, win_condition_cards, challenges_enabled)
  values (generate_room_code(), v_first_player_id, p_playlist_id, 'local_pass', p_win_cards, false)
  returning * into v_room;

  -- 3) Inscrire les joueurs en respectant l'ordre fourni
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

revoke execute on function create_local_room(uuid, uuid, text[], smallint) from public;

notify pgrst, 'reload schema';
