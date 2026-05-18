import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";

// GET /api/parties/[code] — endpoint public (service role côté serveur) pour
// vérifier l'existence d'une salle sans dépendre des policies RLS.
// Le `code` est déjà le secret d'invitation (URL partagée), donc exposer son
// existence + nombre de joueurs + pseudo de l'hôte est sans risque.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  const svc = getSupabaseService();

  const { data: room, error } = await svc
    .from("rooms")
    .select(
      "id, code, host_player_id, status, mode, win_condition_cards, playlist_id, challenges_enabled",
    )
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "lookup_failed", detail: error.message },
      { status: 500 },
    );
  }
  if (!room) {
    return NextResponse.json({ exists: false }, { status: 404 });
  }

  // Compte de joueurs + pseudo de l'hôte (utilisés par /rejoindre pour
  // afficher "Marie-Lou attend").
  const [{ count }, { data: hostMembership }] = await Promise.all([
    svc
      .from("room_players")
      .select("player_id", { count: "exact", head: true })
      .eq("room_id", room.id),
    svc
      .from("room_players")
      .select("pseudo")
      .eq("room_id", room.id)
      .eq("player_id", room.host_player_id)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    exists: true,
    code: room.code,
    status: room.status,
    mode: room.mode,
    win_condition_cards: room.win_condition_cards,
    challenges_enabled: room.challenges_enabled ?? true,
    playlist_id: room.playlist_id,
    host_pseudo: hostMembership?.pseudo ?? null,
    players_count: count ?? 0,
  });
}
