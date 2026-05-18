import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseService } from "@/lib/supabase/service";
import { loadRoomByCode, parseJson, requireUserId, rpcError } from "@/lib/api";
import { requireOperationalMember } from "@/lib/api-room";

const Body = z.object({
  turn_id: z.string().uuid(),
});

// POST /api/parties/[code]/resolve — résout le tour. Idempotent côté DB.
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

  const forbidden = await requireOperationalMember(room.id, userId);
  if (forbidden) return forbidden;

  const svc = getSupabaseService();
  const { data, error } = await svc.rpc("resolve_turn", { p_turn_id: body.turn_id });
  if (error) return rpcError(error);

  return NextResponse.json({ turn: data });
}
