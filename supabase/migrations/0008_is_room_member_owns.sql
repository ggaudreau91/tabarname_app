-- 0008 — is_room_member reconnaît les owners de joueurs virtuels (mode local_pass).
--
-- Symptôme: en mode local_pass, le créateur de la salle voit "Tour 0",
-- pas de carte mystère, pas de musique. Cause: ses joueurs virtuels ont
-- des UUIDs distincts de auth.uid(), donc is_room_member retournait false,
-- et les policies RLS sur turns/challenges/timeline_cards bloquaient la lecture.
--
-- Nouvelle règle: tu es "membre" d'une salle si:
--   - tu es dans room_players directement (cas online/host_audio), OU
--   - tu possèdes (players.auth_id = auth.uid()) au moins un joueur de cette salle.

create or replace function is_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from room_players rp
    left join players p on p.id = rp.player_id
    where rp.room_id = p_room_id
      and (rp.player_id = auth.uid() or p.auth_id = auth.uid())
  );
$$;

notify pgrst, 'reload schema';
