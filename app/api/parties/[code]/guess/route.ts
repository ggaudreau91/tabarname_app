import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseService } from "@/lib/supabase/service";
import { loadRoomByCode, parseJson, requireUserId, rpcError } from "@/lib/api";

const Body = z.object({
  turn_id: z.string().uuid(),
  position: z.number().int().min(0).max(50),
  /** En mode local_pass, le client précise l'ID du joueur virtuel actif. */
  as_player_id: z.string().uuid().optional(),
});

// POST /api/parties/[code]/guess — l'actif soumet sa position
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
  // Si as_player_id fourni, vérifier que l'auth user possède ce joueur virtuel.
  let actorId = userId;
  if (body.as_player_id) {
    const { data: owns } = await svc.rpc("owns_player", {
      p_player_id: body.as_player_id,
      p_auth_id: userId,
    });
    if (!owns) {
      return NextResponse.json({ error: "not_owner_of_player" }, { status: 403 });
    }
    actorId = body.as_player_id;
  }

  const { data, error } = await svc.rpc("submit_guess", {
    p_turn_id: body.turn_id,
    p_player_id: actorId,
    p_position: body.position,
  });
  if (error) return rpcError(error);

  return NextResponse.json({ turn: data });
}
