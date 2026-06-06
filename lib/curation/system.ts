// Compte « système » Tabarname : un player sans auth_id, propriétaire du
// catalogue officiel côté Spotify. Son token (lié via
// scripts/link_system_account.ts) sert UNIQUEMENT à lire /items des playlists
// qu'il possède au moment de l'import. La lecture audio en partie reste sur le
// compte de l'utilisateur connecté.
//
// UUID fixe — DOIT rester identique à:
//   - supabase/migrations/0014_system_account.sql (ligne players)
//   - scripts/link_system_account.ts
export const SYSTEM_PLAYER_ID = "00000000-0000-4000-8000-000000000001";
