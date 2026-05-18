-- 0004 — Permettre à un non-membre de voir l'existence d'une salle.
--
-- Symptôme: quelqu'un qui clique sur le lien partagé (tabarname.app/parties/W7QRJW)
-- ne peut pas charger la page parce que la policy `rooms_member_read` bloque
-- la lecture aux non-membres. Le client reste sur "Chargement…" indéfiniment.
--
-- Décision: rooms et room_players deviennent lisibles publiquement. Le `code`
-- est déjà le secret de la salle (URL partagée = invite). Aucun état sensible
-- (track_id, année non révélée, refresh tokens, etc.) n'est exposé par ce
-- changement — tout ça vit dans `turns`, `turns_public` (masquée), `challenges`,
-- `timeline_cards`, `spotify_tokens`, qui restent restreints aux membres.

drop policy if exists rooms_member_read on rooms;
create policy rooms_public_read on rooms
  for select using (true);

drop policy if exists room_players_member_read on room_players;
create policy room_players_public_read on room_players
  for select using (true);
