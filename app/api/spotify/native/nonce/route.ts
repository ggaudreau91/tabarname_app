import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseService } from "@/lib/supabase/service";

// Émet un nonce à usage unique lié au joueur authentifié, pour l'auth Spotify
// app-à-app (iOS). Le nonce est passé au plugin natif, qui l'inclut dans l'URL
// de token-swap; /api/spotify/native/token-swap le résout → player_id avant de
// stocker les tokens. Voir migration 0013_spotify_auth_nonces.sql.

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 min

export async function GET() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const nonce = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);

  const svc = getSupabaseService();
  const { error } = await svc.from("spotify_auth_nonces").insert({
    nonce,
    player_id: user.id,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ nonce });
}
