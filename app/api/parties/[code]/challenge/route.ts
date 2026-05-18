import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseService } from "@/lib/supabase/service";
import { loadRoomByCode, parseJson, requireUserId, rpcError } from "@/lib/api";

const Body = z.object({
  turn_id: z.string().uuid(),
  position: z.number().int().min(0).max(50),
});

// POST /api/parties/[code]/challenge
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
  const { data, error } = await svc.rpc("add_challenge", {
    p_turn_id: body.turn_id,
    p_challenger_id: userId,
    p_position: body.position,
  });
  if (error) return rpcError(error);

  return NextResponse.json({ challenge: data });
}
