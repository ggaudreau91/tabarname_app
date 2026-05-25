-- 0011 — Permettre l'import de playlists publiques par n'importe quel user
-- connecté en Premium. On garde curated_playlists comme table unique, mais on
-- distingue les playlists "officielles" (curées par un admin) des playlists
-- user-imported via deux nouvelles colonnes.
--
-- Pas besoin de toucher aux RLS: playlists_public_read (is_active = true) +
-- tracks_public_read couvrent déjà la lecture. Les nouvelles playlists
-- user-imported sont créées avec is_active = true par défaut côté API, ce qui
-- les rend immédiatement visibles à tout le monde.

alter table curated_playlists
  add column imported_by uuid references players(id) on delete set null,
  add column is_user_imported boolean not null default false;

create index curated_playlists_imported_by_idx
  on curated_playlists (imported_by)
  where is_user_imported = true;
