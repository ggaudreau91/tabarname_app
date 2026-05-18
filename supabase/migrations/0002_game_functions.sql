-- Tabarname — fonctions plpgsql autoritaires.
-- Toutes en SECURITY DEFINER + REVOKE EXECUTE FROM public : seul le service role
-- les invoque (via les route handlers Next.js). Le client n'a jamais accès direct.
-- La logique de placement/résolution doit refléter EXACTEMENT lib/game/state.ts.

-- ---------------------------------------------------------------------------
-- Helper: une position d'insertion est-elle valide dans la timeline d'un joueur?
-- Reflet de isPlacementCorrect() de lib/game/state.ts.
-- ---------------------------------------------------------------------------
create or replace function is_placement_correct(
  p_room_id uuid,
  p_player_id uuid,
  p_position int,
  p_year int
) returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count int;
  v_before_year smallint;
  v_after_year smallint;
begin
  select count(*) into v_count
  from timeline_cards
  where room_id = p_room_id and player_id = p_player_id;

  if p_position < 0 or p_position > v_count then
    return false;
  end if;

  if p_position > 0 then
    select effective_year into v_before_year
    from timeline_cards
    where room_id = p_room_id and player_id = p_player_id
    order by effective_year asc, acquired_at asc
    offset p_position - 1 limit 1;
    if v_before_year > p_year then return false; end if;
  end if;

  if p_position < v_count then
    select effective_year into v_after_year
    from timeline_cards
    where room_id = p_room_id and player_id = p_player_id
    order by effective_year asc, acquired_at asc
    offset p_position limit 1;
    if v_after_year < p_year then return false; end if;
  end if;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Helper: génère un code de salle unique 6 chars (caractères sans ambiguïté)
-- ---------------------------------------------------------------------------
create or replace function generate_room_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- pas de 0/O/1/I
  v_code text;
  v_exists boolean;
  v_attempts int := 0;
begin
  loop
    v_attempts := v_attempts + 1;
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    select exists (select 1 from rooms where code = v_code) into v_exists;
    if not v_exists then return v_code; end if;
    if v_attempts > 50 then
      raise exception 'generate_room_code: épuisé après 50 tentatives';
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_room — l'hôte crée une salle (statut lobby)
-- ---------------------------------------------------------------------------
create or replace function create_room(
  p_host_id uuid,
  p_playlist_id uuid,
  p_mode room_mode default 'online_premium',
  p_win_cards smallint default 10
) returns rooms
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_room rooms;
begin
  -- garantir un row players pour l'hôte
  insert into players (id) values (p_host_id) on conflict (id) do nothing;

  insert into rooms (code, host_player_id, playlist_id, mode, win_condition_cards)
  values (generate_room_code(), p_host_id, p_playlist_id, p_mode, p_win_cards)
  returning * into v_room;

  return v_room;
end;
$$;

-- ---------------------------------------------------------------------------
-- join_room — un joueur rejoint via le code
-- ---------------------------------------------------------------------------
create or replace function join_room(
  p_code text,
  p_player_id uuid,
  p_pseudo text,
  p_has_premium boolean
) returns room_players
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_room rooms;
  v_membership room_players;
begin
  select * into v_room from rooms where code = p_code;
  if not found then
    raise exception 'room_not_found' using errcode = 'P0001';
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'room_not_in_lobby' using errcode = 'P0002';
  end if;

  insert into players (id) values (p_player_id) on conflict (id) do nothing;

  insert into room_players (room_id, player_id, pseudo, has_premium)
  values (v_room.id, p_player_id, p_pseudo, p_has_premium)
  on conflict (room_id, player_id) do update
    set pseudo = excluded.pseudo,
        has_premium = excluded.has_premium,
        is_connected = true
  returning * into v_membership;

  return v_membership;
end;
$$;

-- ---------------------------------------------------------------------------
-- Helper: pioche une piste aléatoire encore disponible
-- ---------------------------------------------------------------------------
create or replace function _pick_random_track(p_room_id uuid)
returns curated_tracks
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_track curated_tracks;
  v_playlist_id uuid;
begin
  select playlist_id into v_playlist_id from rooms where id = p_room_id;

  -- exclusion 1: pistes déjà jouées comme `turns.track_id`
  -- exclusion 2: pistes déjà attribuées en cartes initiales (timeline_cards)
  select ct.* into v_track
  from curated_tracks ct
  where ct.playlist_id = v_playlist_id
    and ct.is_excluded = false
    and not exists (select 1 from turns t where t.room_id = p_room_id and t.track_id = ct.id)
    and not exists (select 1 from timeline_cards tc where tc.room_id = p_room_id and tc.track_id = ct.id)
  order by random()
  limit 1;

  if not found then
    raise exception 'no_tracks_available' using errcode = 'P0003';
  end if;
  return v_track;
end;
$$;

-- ---------------------------------------------------------------------------
-- start_game — l'hôte démarre. Assigne turn_order, distribue 1 carte initiale,
-- crée le premier tour.
-- ---------------------------------------------------------------------------
create or replace function start_game(p_room_id uuid)
returns turns
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_room rooms;
  v_first_active uuid;
  v_first_turn turns;
  r record;
  v_order smallint := 0;
  v_track curated_tracks;
begin
  select * into v_room from rooms where id = p_room_id for update;
  if not found then raise exception 'room_not_found' using errcode = 'P0001'; end if;
  if v_room.status <> 'lobby' then
    raise exception 'room_not_in_lobby' using errcode = 'P0002';
  end if;

  -- Assigner turn_order par joined_at
  for r in (
    select player_id from room_players
    where room_id = p_room_id
    order by joined_at asc
  ) loop
    update room_players
      set turn_order = v_order
      where room_id = p_room_id and player_id = r.player_id;
    v_order := v_order + 1;
  end loop;

  if v_order < 2 then
    raise exception 'need_at_least_two_players' using errcode = 'P0004';
  end if;

  -- Distribuer 1 carte initiale à chaque joueur (différentes entre elles)
  for r in (
    select player_id from room_players
    where room_id = p_room_id
    order by turn_order asc
  ) loop
    v_track := _pick_random_track(p_room_id);
    insert into timeline_cards (room_id, player_id, track_id, effective_year)
    values (p_room_id, r.player_id, v_track.id, v_track.effective_year);
  end loop;

  -- Premier joueur actif: turn_order = 0
  select player_id into v_first_active from room_players
    where room_id = p_room_id and turn_order = 0;

  v_track := _pick_random_track(p_room_id);
  insert into turns (room_id, turn_number, active_player_id, track_id)
  values (p_room_id, 1, v_first_active, v_track.id)
  returning * into v_first_turn;

  update rooms
    set status = 'in_progress',
        started_at = now(),
        current_turn_id = v_first_turn.id
    where id = p_room_id;

  insert into game_events (room_id, turn_id, actor_player_id, event_type, payload)
  values (p_room_id, v_first_turn.id, v_room.host_player_id, 'game_started', '{}'::jsonb);

  return v_first_turn;
end;
$$;

-- ---------------------------------------------------------------------------
-- submit_guess — le joueur actif soumet sa position; passe à challenge_window.
-- ---------------------------------------------------------------------------
create or replace function submit_guess(
  p_turn_id uuid,
  p_player_id uuid,
  p_position int
) returns turns
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_turn turns;
begin
  select * into v_turn from turns where id = p_turn_id for update;
  if not found then raise exception 'turn_not_found' using errcode = 'P0005'; end if;
  if v_turn.active_player_id <> p_player_id then
    raise exception 'not_active_player' using errcode = 'P0006';
  end if;
  if v_turn.phase not in ('turn_playing', 'guess_window') then
    raise exception 'wrong_phase' using errcode = 'P0007';
  end if;

  update turns
    set guess_position = p_position,
        phase = 'challenge_window',
        phase_changed_at = now()
    where id = p_turn_id
    returning * into v_turn;

  insert into game_events (room_id, turn_id, actor_player_id, event_type, payload)
  values (v_turn.room_id, v_turn.id, p_player_id, 'guess_submitted',
          jsonb_build_object('position', p_position));

  return v_turn;
end;
$$;

-- ---------------------------------------------------------------------------
-- add_challenge — un autre joueur conteste pendant challenge_window
-- ---------------------------------------------------------------------------
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
begin
  select * into v_turn from turns where id = p_turn_id for update;
  if not found then raise exception 'turn_not_found' using errcode = 'P0005'; end if;
  if v_turn.phase <> 'challenge_window' then
    raise exception 'wrong_phase' using errcode = 'P0007';
  end if;
  if v_turn.active_player_id = p_challenger_id then
    raise exception 'active_cannot_challenge' using errcode = 'P0008';
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

-- ---------------------------------------------------------------------------
-- resolve_turn — la résolution autoritaire.
-- Reflet exact de resolveTurn() de lib/game/state.ts:
--   1. Si actif correct → actif gagne. Challengers NON évalués.
--   2. Sinon, premier challenger correct (par created_at) gagne.
--   3. Sinon all_wrong, aucune carte attribuée.
-- Idempotent: si turn.phase = 'resolved', retourne sans rien refaire.
-- ---------------------------------------------------------------------------
create or replace function resolve_turn(p_turn_id uuid)
returns turns
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_turn turns;
  v_track curated_tracks;
  v_active_correct boolean;
  v_winner_id uuid := null;
  v_winner_position int := null;
  v_outcome turn_outcome;
  v_challenge record;
  v_correct boolean;
  v_winner_card_count int;
begin
  select * into v_turn from turns where id = p_turn_id for update;
  if not found then raise exception 'turn_not_found' using errcode = 'P0005'; end if;

  -- Idempotence
  if v_turn.phase = 'resolved' then
    return v_turn;
  end if;
  if v_turn.phase not in ('challenge_window', 'reveal') then
    raise exception 'wrong_phase' using errcode = 'P0007';
  end if;
  if v_turn.guess_position is null then
    raise exception 'no_guess_recorded' using errcode = 'P0010';
  end if;

  select * into v_track from curated_tracks where id = v_turn.track_id;

  -- 1. Actif
  v_active_correct := is_placement_correct(
    v_turn.room_id, v_turn.active_player_id,
    v_turn.guess_position, v_track.effective_year
  );

  if v_active_correct then
    v_outcome := 'active_correct';
    v_winner_id := v_turn.active_player_id;
    v_winner_position := v_turn.guess_position;
  else
    -- 2. Challengers dans l'ordre d'arrivée
    for v_challenge in (
      select * from challenges where turn_id = p_turn_id order by created_at asc
    ) loop
      v_correct := is_placement_correct(
        v_turn.room_id, v_challenge.challenger_id,
        v_challenge.proposed_position, v_track.effective_year
      );
      if v_correct then
        v_outcome := 'challenger_correct';
        v_winner_id := v_challenge.challenger_id;
        v_winner_position := v_challenge.proposed_position;
        exit;
      end if;
    end loop;

    if v_winner_id is null then
      v_outcome := 'all_wrong';
    end if;
  end if;

  -- Attribution
  if v_winner_id is not null then
    insert into timeline_cards (room_id, player_id, track_id, effective_year)
    values (v_turn.room_id, v_winner_id, v_track.id, v_track.effective_year);
  end if;

  update turns
    set phase = 'resolved',
        outcome = v_outcome,
        phase_changed_at = now(),
        resolved_at = now()
    where id = p_turn_id
    returning * into v_turn;

  insert into game_events (room_id, turn_id, actor_player_id, event_type, payload)
  values (v_turn.room_id, v_turn.id, v_winner_id, 'turn_resolved',
          jsonb_build_object(
            'outcome', v_outcome,
            'winner_id', v_winner_id,
            'position', v_winner_position,
            'true_year', v_track.effective_year,
            'track_id', v_track.id
          ));

  -- Condition de victoire
  if v_winner_id is not null then
    select count(*) into v_winner_card_count
    from timeline_cards
    where room_id = v_turn.room_id and player_id = v_winner_id;

    if v_winner_card_count >= (select win_condition_cards from rooms where id = v_turn.room_id) then
      update rooms
        set status = 'finished', finished_at = now()
        where id = v_turn.room_id;
      insert into game_events (room_id, turn_id, actor_player_id, event_type, payload)
      values (v_turn.room_id, v_turn.id, v_winner_id, 'game_over',
              jsonb_build_object('winner_id', v_winner_id));
    end if;
  end if;

  return v_turn;
end;
$$;

-- ---------------------------------------------------------------------------
-- advance_to_next_turn — après reveal, démarre le tour suivant.
-- Choisit le prochain joueur actif (rotation, saute déconnectés) et pioche
-- une nouvelle piste. Retourne le nouveau turn, ou null si game_over.
-- ---------------------------------------------------------------------------
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
    return null;  -- game déjà fini ou pas démarré
  end if;

  select * into v_last_turn from turns where id = v_room.current_turn_id;
  if not found or v_last_turn.phase <> 'resolved' then
    raise exception 'previous_turn_not_resolved' using errcode = 'P0011';
  end if;

  select turn_order into v_active_idx from room_players
    where room_id = p_room_id and player_id = v_last_turn.active_player_id;

  select count(*) into v_player_count from room_players where room_id = p_room_id;

  -- Cherche prochain joueur connecté
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

-- ---------------------------------------------------------------------------
-- Verrouillage des fonctions: seul service_role peut les exécuter
-- ---------------------------------------------------------------------------
revoke execute on function is_placement_correct(uuid, uuid, int, int) from public;
revoke execute on function generate_room_code() from public;
revoke execute on function create_room(uuid, uuid, room_mode, smallint) from public;
revoke execute on function join_room(text, uuid, text, boolean) from public;
revoke execute on function _pick_random_track(uuid) from public;
revoke execute on function start_game(uuid) from public;
revoke execute on function submit_guess(uuid, uuid, int) from public;
revoke execute on function add_challenge(uuid, uuid, int) from public;
revoke execute on function resolve_turn(uuid) from public;
revoke execute on function advance_to_next_turn(uuid) from public;
