import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { loadRoomByCode, requireUserId } from "@/lib/api";

// GET /api/parties/[code]/me — renvoie la liste des player_ids dans cette salle
// possédés par l'auth user (1 pour online/host_audio, N pour local_pass).
export async function GET(
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
  // Tous les room_players où le player est possédé par l'auth user
  const { data, error } = await svc
    .from("room_players")
    .select("player_id, player:players!inner(auth_id)")
    .eq("room_id", room.id)
    .eq("player.auth_id", userId);

  if (error) {
    return NextResponse.json(
      { error: "lookup_failed", detail: error.message },
      { status: 500 },
    );
  }

  const ids = (data ?? []).map((r) => r.player_id as string);
  return NextResponse.json({ owned_player_ids: ids });
}
