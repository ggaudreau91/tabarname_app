import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/api";
import { getSupabaseService } from "@/lib/supabase/service";

// POST /api/spotify/disconnect — retire le lien Spotify du compte courant
// (supprime les jetons chiffrés) sans supprimer le compte de jeu.
export async function POST() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const svc = getSupabaseService();
  const { error } = await svc.from("spotify_tokens").delete().eq("player_id", userId);
  if (error) {
    return NextResponse.json({ error: "disconnect_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
