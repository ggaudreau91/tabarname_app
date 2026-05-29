-- 0013 — Nonces pour l'auth Spotify app-à-app (iOS natif).
--
-- Sur iOS, l'autorisation passe par le SDK Spotify (SPTSessionManager) qui fait
-- son POST de token-swap via l'URLSession native — SANS les cookies Supabase de
-- la WebView. Le backend ne peut donc pas savoir à quel joueur appartiennent les
-- tokens à partir de la requête seule.
--
-- Solution: la WebView (authentifiée) demande un nonce à usage unique lié à son
-- player_id; le plugin natif le passe dans l'URL de token-swap; l'endpoint
-- résout nonce → player_id avant saveTokens, puis consomme le nonce.
--
-- Service role uniquement (comme spotify_tokens): aucune policy → tout refusé
-- sauf bypass service_role.

create table spotify_auth_nonces (
  nonce text primary key,
  player_id uuid not null references players(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index spotify_auth_nonces_expires_at_idx
  on spotify_auth_nonces (expires_at);

alter table spotify_auth_nonces enable row level security;
-- (pas de policy → tout refusé sauf bypass service_role)
