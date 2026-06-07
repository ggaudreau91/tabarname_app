import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/api";
import { getSupabaseService } from "@/lib/supabase/service";

// POST /api/account/delete — suppression de compte (exigée par Apple 5.1.1(v)).
//
// Modèle de données: plusieurs tables (turns, timeline_cards, challenges, rooms,
// game_events) référencent players(id) SANS `on delete cascade`. Supprimer la
// ligne `players` casserait l'intégrité de parties partagées avec d'autres
// joueurs. On supprime donc les DONNÉES PERSONNELLES (jetons Spotify + compte
// d'auth Supabase, qui porte le courriel) et on anonymise le player, en
// conservant l'historique de jeu partagé.
//
// `players.auth_id → auth.users` est `on delete cascade`: supprimer l'user d'auth
// tenterait de supprimer les players liés → erreur FK. On délie donc `auth_id`
// AVANT de supprimer l'user d'auth.
export async function POST() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const svc = getSupabaseService();

  // 1. Jetons Spotify (données sensibles)
  const { error: tokErr } = await svc.from("spotify_tokens").delete().eq("player_id", userId);
  if (tokErr) {
    return NextResponse.json({ error: "delete_failed", detail: tokErr.message }, { status: 500 });
  }

  // 2. Adhésions aux salons du joueur (FK cascade-safe)
  await svc.from("room_players").delete().eq("player_id", userId);

  // 3. Anonymiser le player principal + délier toutes les références auth_id
  //    (player principal ET joueurs virtuels local_pass créés par ce compte),
  //    pour que la suppression de l'user d'auth ne cascade pas sur players.
  await svc.from("players").update({ display_name: null, auth_id: null }).eq("id", userId);
  await svc.from("players").update({ auth_id: null }).eq("auth_id", userId);

  // 4. Supprimer l'utilisateur d'authentification Supabase (porte le courriel)
  const { error: authErr } = await svc.auth.admin.deleteUser(userId);
  if (authErr) {
    return NextResponse.json({ error: "delete_failed", detail: authErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
