import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";

// Vérifie si l'auth user est "membre opérationnel" d'une salle:
//   - en mode online: il a un row room_players direct
//   - en mode local_pass: il possède au moins un joueur virtuel inscrit
export async function isOperationalMember(
  roomId: string,
  userId: string,
): Promise<boolean> {
  const svc = getSupabaseService();

  // Cas direct
  const { data: direct } = await svc
    .from("room_players")
    .select("player_id")
    .eq("room_id", roomId)
    .eq("player_id", userId)
    .maybeSingle();
  if (direct) return true;

  // Cas local: cherche un room_player dont le player est possédé par userId
  const { data: ownedRoomPlayers } = await svc
    .from("room_players")
    .select("player_id, player:players!inner(auth_id)")
    .eq("room_id", roomId)
    .eq("player.auth_id", userId)
    .limit(1);
  return !!(ownedRoomPlayers && ownedRoomPlayers.length > 0);
}

// Renvoie un NextResponse 403 si pas opérationnel. Helper pour les routes.
export async function requireOperationalMember(
  roomId: string,
  userId: string,
): Promise<NextResponse | null> {
  if (await isOperationalMember(roomId, userId)) return null;
  return NextResponse.json({ error: "not_room_member" }, { status: 403 });
}
