import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { loadRoomByCode, requireUserId, rpcError } from "@/lib/api";

// POST /api/parties/[code]/start — l'hôte (ou le créateur en local_pass) démarre.
// En mode local_pass, l'auth user qui a créé la salle doit posséder le host virtuel.
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

  // Autorisation: soit l'auth user EST l'hôte, soit il POSSÈDE l'hôte (local_pass).
  if (room.host_player_id !== userId) {
    const { data: owns } = await svc.rpc("owns_player", {
      p_player_id: room.host_player_id,
      p_auth_id: userId,
    });
    if (!owns) {
      return NextResponse.json({ error: "not_host" }, { status: 403 });
    }
  }

  const { data, error } = await svc.rpc("start_game", { p_room_id: room.id });
  if (error) return rpcError(error);

  return NextResponse.json({ turn: data });
}
