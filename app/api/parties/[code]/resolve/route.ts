import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseService } from "@/lib/supabase/service";
import { loadRoomByCode, parseJson, requireUserId, rpcError } from "@/lib/api";

const Body = z.object({
  turn_id: z.string().uuid(),
});

// POST /api/parties/[code]/resolve — résout le tour (déclenché par le client
// quand le timer challenge expire, ou par un job de filet de sécurité).
// Idempotent côté DB.
export async function POST(
  req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await parseJson(req, Body);
  if (body instanceof NextResponse) return body;

  const room = await loadRoomByCode(code);
  if (!room) {
    return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  }

  const svc = getSupabaseService();

  // Vérifier que l'appelant est membre de la salle (défense en profondeur;
  // l'authorisation principale reste côté RLS/RPC).
  const { data: membership } = await svc
    .from("room_players")
    .select("player_id")
    .eq("room_id", room.id)
    .eq("player_id", userId)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "not_room_member" }, { status: 403 });
  }

  const { data, error } = await svc.rpc("resolve_turn", { p_turn_id: body.turn_id });
  if (error) return rpcError(error);

  return NextResponse.json({ turn: data });
}
