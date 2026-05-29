import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/spotify/tokens";

// GET /api/spotify/devices — liste les devices Spotify dispos pour ce user.
// Utilisé sur iOS où le Web Playback SDK est cassé: le user joue via Connect
// sur son app Spotify mobile.
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

  const res = await fetch("https://api.spotify.com/v1/me/player/devices", {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json(
      { error: "spotify_failed", status: res.status, detail: await res.text() },
      { status: 502 },
    );
  }
  const data = (await res.json()) as {
    devices: Array<{
      id: string | null;
      is_active: boolean;
      is_restricted: boolean;
      name: string;
      type: string;
      volume_percent: number | null;
    }>;
  };
  // On filtre les devices sans id (rare, mais arrive) et restricted.
  const devices = (data.devices ?? [])
    .filter((d) => d.id && !d.is_restricted)
    .map((d) => ({
      id: d.id as string,
      name: d.name,
      type: d.type,
      is_active: d.is_active,
    }));
  return NextResponse.json({ devices });
}
