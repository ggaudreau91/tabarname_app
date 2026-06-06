import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/api";
import { getSupabaseService } from "@/lib/supabase/service";
import { SYSTEM_PLAYER_ID } from "@/lib/curation/system";

function isAdmin(userId: string): boolean {
  const allowList = (process.env.ADMIN_PLAYER_IDS ?? "").split(",").map((s) => s.trim());
  return allowList.includes(userId);
}

// GET /api/admin/system-account — état de liaison du compte Spotify Tabarname.
// spotify_tokens n'a pas de RLS lisible côté client → on passe par le service role.
export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: "not_admin" }, { status: 403 });
  }

  const svc = getSupabaseService();
  const { data } = await svc
    .from("spotify_tokens")
    .select("spotify_user_id, scope, product, updated_at")
    .eq("player_id", SYSTEM_PLAYER_ID)
    .maybeSingle();

  return NextResponse.json({
    linked: !!data,
    spotify_user_id: data?.spotify_user_id ?? null,
    product: data?.product ?? null,
    updated_at: data?.updated_at ?? null,
    can_read_playlists: !!data?.scope?.includes("playlist-read-private"),
  });
}
