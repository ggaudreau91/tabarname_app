import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/spotify/tokens";

// Appelé par le Web Playback SDK côté client.
// Retourne un access token court-vivant; refresh transparent côté serveur.
export async function GET() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const tokens = await getValidAccessToken(user.id);
  if (!tokens) {
    return NextResponse.json({ error: "no_spotify_link" }, { status: 404 });
  }

  return NextResponse.json({
    access_token: tokens.accessToken,
    expires_at: tokens.expiresAt.toISOString(),
    product: tokens.product,
  });
}
