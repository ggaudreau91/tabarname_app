import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { loadRoomByCode, requireUserId, rpcError } from "@/lib/api";

// POST /api/parties/[code]/start — l'hôte démarre la partie
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
  if (room.host_player_id !== userId) {
    return NextResponse.json({ error: "not_host" }, { status: 403 });
  }

  const svc = getSupabaseService();
  const { data, error } = await svc.rpc("start_game", { p_room_id: room.id });
  if (error) return rpcError(error);

  return NextResponse.json({ turn: data });
}
