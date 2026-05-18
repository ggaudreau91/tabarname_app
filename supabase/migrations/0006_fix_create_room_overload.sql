-- 0006 — Nettoie l'overload de create_room.
--
-- La migration 0005 a créé une nouvelle version 5-args de create_room sans
-- supprimer la version 4-args originale (0002). PostgREST se retrouve avec
-- deux signatures overloadées et ne sait plus laquelle utiliser → erreur
-- "Could not find the function … in the schema cache".

-- Drop explicitement l'ancienne version 4-args.
drop function if exists create_room(uuid, uuid, room_mode, smallint);

-- Force PostgREST à recharger son schema cache (sinon il faut attendre
-- l'auto-reload, qui peut prendre quelques secondes).
notify pgrst, 'reload schema';
