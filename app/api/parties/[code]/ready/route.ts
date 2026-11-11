import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseService } from "@/lib/supabase/service";
import { loadRoomByCode, parseJson, requireUserId } from "@/lib/api";
import { requireOperationalMember } from "@/lib/api-room";

const Body = z.object({
  turn_id: z.string().uuid(),
});

// POST /api/parties/[code]/ready — mode local (« Autour d'une table »):
// le joueur vient de prendre l'appareil et a touché « Je suis prêt ».
// Le tour suivant est créé dès la résolution du précédent, donc son
// phase_changed_at date de l'écran de révélation — le chrono serait déjà
// entamé. On le fait repartir d'ici: phase_changed_at = maintenant.
// Garde-fous: seulement en local_pass, seulement si le tour est encore en
// turn_playing (idempotent: rejouer la requête ne fait que re-tamponner).
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
  if (room.mode !== "local_pass") {
    return NextResponse.json({ error: "local_mode_only" }, { status: 400 });
  }

  const forbidden = await requireOperationalMember(room.id, userId);
  if (forbidden) return forbidden;

  const svc = getSupabaseService();
  const { data, error } = await svc
    .from("turns")
    .update({ phase_changed_at: new Date().toISOString() })
    .eq("id", body.turn_id)
    .eq("room_id", room.id)
    .eq("phase", "turn_playing")
    .select("id, phase, phase_changed_at")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ turn: data });
}
