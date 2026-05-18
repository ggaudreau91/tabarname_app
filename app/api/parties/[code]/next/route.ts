import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { loadRoomByCode, requireUserId, rpcError } from "@/lib/api";

// POST /api/parties/[code]/next — démarre le tour suivant après reveal.
// Tout membre de la salle peut déclencher (typiquement après animation reveal).
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const room = await loadRoomByCode(code);
  if (!room) {
    return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  }

  const svc = getSupabaseService();
  const { data: membership } = await svc
    .from("room_players")
    .select("player_id")
    .eq("room_id", room.id)
    .eq("player_id", userId)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "not_room_member" }, { status: 403 });
  }

  const { data, error } = await svc.rpc("advance_to_next_turn", {
    p_room_id: room.id,
  });
  if (error) return rpcError(error);

  // Si la partie est terminée, advance_to_next_turn retourne null
  if (!data) {
    return NextResponse.json({ turn: null, status: "finished" });
  }
  return NextResponse.json({ turn: data });
}
