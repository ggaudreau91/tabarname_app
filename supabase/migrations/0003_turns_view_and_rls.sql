-- 0003 — Ajustements pour le client multijoueur (Sprint 3).
--
-- 1. La vue `turns_public` est en SECURITY INVOKER → elle exige une policy SELECT
--    sur la table `turns` pour que les membres de la salle puissent la lire.
--    On ajoute cette policy. La protection du secret (année, titre) reste assurée
--    par les CASE WHEN dans la vue elle-même.
--
-- 2. On expose `spotify_uri` dès la phase `turn_playing` (et non plus seulement
--    au reveal) — le client a besoin de l'URI pour lancer la lecture via le
--    Web Playback SDK. Compromis assumé: le SDK exposera titre/artiste à
--    `player_state_changed`, mitigé par règle d'honneur dans l'UI.

-- ---------------------------------------------------------------------------
create policy turns_member_read on turns
  for select using (is_room_member(room_id));

-- ---------------------------------------------------------------------------
drop view if exists turns_public;

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
  -- spotify_uri visible dès le lancement du tour (pour permettre la lecture)
  ct.spotify_uri,
  -- track_id (interne) et métadonnées révélatrices: seulement au reveal
  case when t.phase in ('reveal', 'resolved') then t.track_id end as track_id,
  case when t.phase in ('reveal', 'resolved') then ct.title end as title,
  case when t.phase in ('reveal', 'resolved') then ct.artists end as artists,
  case when t.phase in ('reveal', 'resolved') then ct.cover_url end as cover_url,
  case when t.phase in ('reveal', 'resolved') then ct.effective_year end as effective_year
from turns t
join curated_tracks ct on ct.id = t.track_id;
