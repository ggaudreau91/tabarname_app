-- Compte « système » Tabarname : player sans auth_id, propriétaire du catalogue
-- officiel côté Spotify. Son token (lié via scripts/link_system_account.ts) sert
-- à lire /items des playlists qu'il possède à l'import. Depuis le changement
-- d'API Spotify de février 2026, /items ne renvoie le contenu QUE pour les
-- playlists possédées par le compte du token — d'où ce compte dédié.
--
-- L'UUID DOIT rester identique à SYSTEM_PLAYER_ID (lib/curation/system.ts).
insert into players (id, display_name)
values ('00000000-0000-4000-8000-000000000001', 'Tabarname (système)')
on conflict (id) do nothing;
