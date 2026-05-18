import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { loadRoomByCode, requireUserId, rpcError } from "@/lib/api";
import { requireOperationalMember } from "@/lib/api-room";

// POST /api/parties/[code]/next — démarre le tour suivant après reveal.
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

  const forbidden = await requireOperationalMember(room.id, userId);
  if (forbidden) return forbidden;

  const svc = getSupabaseService();
  const { data, error } = await svc.rpc("advance_to_next_turn", {
    p_room_id: room.id,
  });
  if (error) return rpcError(error);

  if (!data) {
    return NextResponse.json({ turn: null, status: "finished" });
  }
  return NextResponse.json({ turn: data });
}
