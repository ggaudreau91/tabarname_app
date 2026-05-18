import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseService } from "@/lib/supabase/service";
import { parseJson, requireUserId } from "@/lib/api";
import { rpcError } from "@/lib/api";

const Body = z.object({
  playlist_id: z.string().uuid(),
  mode: z.enum(["online_premium", "host_audio"]).default("online_premium"),
  win_condition_cards: z.number().int().min(3).max(20).default(10),
  pseudo: z.string().min(1).max(40),
  has_premium: z.boolean().default(false),
});

// POST /api/parties — créer une salle (host = current user)
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await parseJson(req, Body);
  if (body instanceof NextResponse) return body;

  const svc = getSupabaseService();
  const { data: room, error: createErr } = await svc.rpc("create_room", {
    p_host_id: userId,
    p_playlist_id: body.playlist_id,
    p_mode: body.mode,
    p_win_cards: body.win_condition_cards,
  });
  if (createErr) return rpcError(createErr);

  // L'hôte rejoint immédiatement sa propre salle
  const { data: membership, error: joinErr } = await svc.rpc("join_room", {
    p_code: room.code,
    p_player_id: userId,
    p_pseudo: body.pseudo,
    p_has_premium: body.has_premium,
  });
  if (joinErr) return rpcError(joinErr);

  return NextResponse.json({ room, membership }, { status: 201 });
}
