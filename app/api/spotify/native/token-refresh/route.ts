import { NextResponse } from "next/server";
import { refreshAccessToken } from "@/lib/spotify/oauth";

// Token-refresh de l'auth Spotify app-à-app (iOS). Filet de sécurité: le SDK
// Spotify appelle cet URL quand sa session en mémoire expire. Stateless — on
// échange le refresh_token fourni et on renvoie le JSON au format SDK. Le refresh
// CANONIQUE de l'app reste getValidAccessToken (côté /api/spotify/access-token);
// cet endpoint sert uniquement à garder la session SDK valide sans erreur.
//
// Body x-www-form-urlencoded du SDK: grant_type=refresh_token & refresh_token=<rt>

export async function POST(req: Request) {
  const form = new URLSearchParams(await req.text());
  const refreshToken = form.get("refresh_token");
  if (!refreshToken) {
    return NextResponse.json({ error: "missing_refresh_token" }, { status: 400 });
  }

  try {
    const refreshed = await refreshAccessToken({
      refreshToken,
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
    });

    return NextResponse.json({
      access_token: refreshed.access_token,
      token_type: "Bearer",
      expires_in: refreshed.expires_in,
      refresh_token: refreshed.refresh_token,
      scope: refreshed.scope,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
