import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseService } from "@/lib/supabase/service";
import { parseJson, requireUserId } from "@/lib/api";
import { rpcError } from "@/lib/api";

const OnlineBody = z.object({
  mode: z.enum(["online_premium", "host_audio"]).default("online_premium"),
  playlist_id: z.string().uuid(),
  win_condition_cards: z.number().int().min(3).max(20).default(10),
  challenges_enabled: z.boolean().default(true),
  pseudo: z.string().min(1).max(40),
  has_premium: z.boolean().default(false),
});

const LocalBody = z.object({
  mode: z.literal("local_pass"),
  playlist_id: z.string().uuid(),
  win_condition_cards: z.number().int().min(3).max(20).default(10),
  local_players: z.array(z.string().min(1).max(40)).min(2).max(8),
});

const Body = z.union([OnlineBody, LocalBody]);

// POST /api/parties — crée une salle.
// 2 chemins selon le mode:
//   - online_premium / host_audio: 1 joueur (le créateur) avec son auth.uid()
//   - local_pass: N joueurs virtuels possédés par l'auth.uid() du créateur
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await parseJson(req, Body);
  if (body instanceof NextResponse) return body;

  const svc = getSupabaseService();

  if (body.mode === "local_pass") {
    const { data: room, error } = await svc.rpc("create_local_room", {
      p_auth_id: userId,
      p_playlist_id: body.playlist_id,
      p_pseudos: body.local_players,
      p_win_cards: body.win_condition_cards,
    });
    if (error) return rpcError(error);
    return NextResponse.json({ room }, { status: 201 });
  }

  // S'assurer qu'un player existe pour l'auth user (cas online)
  await svc.from("players").upsert({ id: userId, auth_id: userId }, { onConflict: "id" });

  const { data: room, error: createErr } = await svc.rpc("create_room", {
    p_host_id: userId,
    p_playlist_id: body.playlist_id,
    p_mode: body.mode,
    p_win_cards: body.win_condition_cards,
    p_challenges_enabled: body.challenges_enabled,
  });
  if (createErr) return rpcError(createErr);

  const { data: membership, error: joinErr } = await svc.rpc("join_room", {
    p_code: room.code,
    p_player_id: userId,
    p_pseudo: body.pseudo,
    p_has_premium: body.has_premium,
  });
  if (joinErr) return rpcError(joinErr);

  return NextResponse.json({ room, membership }, { status: 201 });
}
