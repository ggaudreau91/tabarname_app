import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import { loadRoomByCode, requireUserId } from "@/lib/api";

// POST /api/parties/[code]/leave — marque le joueur déconnecté.
// On NE supprime PAS le row room_players: l'historique compte, le joueur
// peut se reconnecter, et turn_order reste cohérent.
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
  const { error } = await svc
    .from("room_players")
    .update({ is_connected: false })
    .eq("room_id", room.id)
    .eq("player_id", userId);

  if (error) {
    return NextResponse.json(
      { error: "update_failed", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
