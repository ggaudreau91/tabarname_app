import { NextResponse } from "next/server";
import { getSupabaseService } from "@/lib/supabase/service";
import {
  exchangeCodeForTokensConfidential,
  fetchSpotifyMe,
  SPOTIFY_NATIVE_REDIRECT_URI,
} from "@/lib/spotify/oauth";
import { saveTokens } from "@/lib/spotify/tokens";

// Token-swap de l'auth Spotify app-à-app (iOS). Appelé par le SDK Spotify
// (URLSession native, SANS cookies Supabase) avec le code d'autorisation. On
// résout le nonce (query string) → player_id, on échange le code côté serveur
// (confidential-client, client_secret), on stocke les tokens chiffrés, puis on
// renvoie le JSON au format attendu par le SDK.
//
// Le SDK envoie un body x-www-form-urlencoded:
//   grant_type=authorization_code & code=<code> & redirect_uri=tabarname-spotify://callback

export async function POST(req: Request) {
  const url = new URL(req.url);
  const nonce = url.searchParams.get("nonce");
  if (!nonce) {
    return NextResponse.json({ error: "missing_nonce" }, { status: 400 });
  }

  const form = new URLSearchParams(await req.text());
  const code = form.get("code");
  if (!code) {
    return NextResponse.json({ error: "missing_code" }, { status: 400 });
  }

  // Résout + consomme le nonce de façon atomique (un seul UPDATE conditionnel).
  const svc = getSupabaseService();
  const { data: consumed, error: nonceError } = await svc
    .from("spotify_auth_nonces")
    .update({ used_at: new Date().toISOString() })
    .eq("nonce", nonce)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("player_id")
    .maybeSingle<{ player_id: string }>();

  if (nonceError) {
    return NextResponse.json({ error: nonceError.message }, { status: 500 });
  }
  if (!consumed) {
    return NextResponse.json({ error: "invalid_or_expired_nonce" }, { status: 401 });
  }

  try {
    const tokens = await exchangeCodeForTokensConfidential({
      code,
      redirectUri: SPOTIFY_NATIVE_REDIRECT_URI,
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
    });

    const me = await fetchSpotifyMe(tokens.access_token);

    await saveTokens(consumed.player_id, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope,
      product: me.product,
      spotifyUserId: me.id,
    });

    // Réponse au format SDK Spotify (token-swap).
    return NextResponse.json({
      access_token: tokens.access_token,
      token_type: "Bearer",
      expires_in: tokens.expires_in,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
