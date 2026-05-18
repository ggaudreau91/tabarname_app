-- 0007 — Mode "pass-and-play": un seul appareil, plusieurs joueurs virtuels
-- qui se passent l'appareil autour d'une table.
--
-- Changements:
--   1. `players.id` n'est plus FK strict vers auth.users — c'est juste une UUID.
--      Un nouveau champ `players.auth_id` (FK nullable vers auth.users) indique
--      quel compte authentifié a CRÉÉ ce joueur. Pour online/host_audio,
--      auth_id == id. Pour local_pass, auth_id = créateur, id = nouvelle UUID
--      par joueur virtuel.
--   2. Nouvel item dans l'enum room_mode: `local_pass`.

-- Drop l'ancienne contrainte FK strict
alter table players drop constraint if exists players_id_fkey;

-- Ajouter auth_id (qui possède le joueur, pour autorisation côté API)
alter table players add column if not exists auth_id uuid references auth.users(id) on delete cascade;

-- Backfill: les joueurs existants étaient = auth.uid()
update players set auth_id = id where auth_id is null;

create index if not exists players_auth_id_idx on players (auth_id);

-- Ajouter le mode local_pass à l'enum
alter type room_mode add value if not exists 'local_pass';

-- Helper: vérifie si un auth user possède un player_id donné.
-- Utilisé par les route handlers pour valider les actions "as_player_id" en mode local.
create or replace function owns_player(p_player_id uuid, p_auth_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from players where id = p_player_id and auth_id = p_auth_id
  );
$$;

revoke execute on function owns_player(uuid, uuid) from public;

-- RPC: créer une salle local_pass avec un tableau de pseudos.
-- Renvoie la salle + l'id du premier joueur virtuel créé (le "host virtuel" qui
-- sera affiché comme hôte dans le lobby).
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
  v_first_player_id uuid;
  v_player_id uuid;
  v_pseudo text;
begin
  if array_length(p_pseudos, 1) is null or array_length(p_pseudos, 1) < 2 then
    raise exception 'need_at_least_two_players' using errcode = 'P0004';
  end if;

  -- Créer N joueurs virtuels, tous possédés par l'auth_id du créateur
  foreach v_pseudo in array p_pseudos loop
    insert into players (id, display_name, auth_id)
    values (gen_random_uuid(), v_pseudo, p_auth_id)
    returning id into v_player_id;
    if v_first_player_id is null then
      v_first_player_id := v_player_id;
    end if;
  end loop;

  -- Le premier joueur est l'hôte virtuel
  insert into rooms (code, host_player_id, playlist_id, mode, win_condition_cards, challenges_enabled)
  values (generate_room_code(), v_first_player_id, p_playlist_id, 'local_pass', p_win_cards, false)
  returning * into v_room;

  -- Inscrire tous les joueurs dans room_players, dans l'ordre fourni
  declare
    v_order smallint := 0;
  begin
    for v_player_id in (
      select id from players where auth_id = p_auth_id and display_name = any(p_pseudos)
      order by created_at asc
    ) loop
      insert into room_players (room_id, player_id, pseudo, turn_order, has_premium, is_connected)
      values (
        v_room.id,
        v_player_id,
        (select display_name from players where id = v_player_id),
        v_order,
        true,  -- en mode local, l'auth user a déjà Premium (validé client-side)
        true
      );
      v_order := v_order + 1;
    end loop;
  end;

  return v_room;
end;
$$;

revoke execute on function create_local_room(uuid, uuid, text[], smallint) from public;

-- Force PostgREST à recharger
notify pgrst, 'reload schema';
