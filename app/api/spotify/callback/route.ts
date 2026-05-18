import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  PKCE_COOKIE,
  STATE_COOKIE,
  exchangeCodeForTokens,
  fetchSpotifyMe,
} from "@/lib/spotify/oauth";
import { saveTokens } from "@/lib/spotify/tokens";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const cookieStore = await cookies();
  const verifier = cookieStore.get(PKCE_COOKIE)?.value;
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  const returnTo = cookieStore.get("spotify_return_to")?.value ?? "/";

  console.log("[spotify/callback]", {
    hit_host: url.host,
    has_code: !!code,
    has_state: !!state,
    has_verifier_cookie: !!verifier,
    has_state_cookie: !!expectedState,
    all_cookie_names: cookieStore.getAll().map((c) => c.name),
  });

  // Cleanup des cookies de flow OAuth dans tous les cas
  cookieStore.delete(PKCE_COOKIE);
  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete("spotify_return_to");

  if (oauthError) {
    return NextResponse.redirect(new URL(`/?spotify_error=${oauthError}`, process.env.APP_URL!));
  }
  if (!code || !state || !verifier || !expectedState) {
    return NextResponse.redirect(new URL("/?spotify_error=missing_params", process.env.APP_URL!));
  }
  if (state !== expectedState) {
    return NextResponse.redirect(new URL("/?spotify_error=state_mismatch", process.env.APP_URL!));
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/?spotify_error=no_session", process.env.APP_URL!));
  }

  try {
    const tokens = await exchangeCodeForTokens({
      code,
      codeVerifier: verifier,
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      redirectUri: process.env.SPOTIFY_REDIRECT_URI!,
    });

    const me = await fetchSpotifyMe(tokens.access_token);

    await saveTokens(user.id, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope,
      product: me.product,
      spotifyUserId: me.id,
    });

    return NextResponse.redirect(new URL(returnTo, process.env.APP_URL!));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.redirect(
      new URL(`/?spotify_error=${encodeURIComponent(msg)}`, process.env.APP_URL!),
    );
  }
}
