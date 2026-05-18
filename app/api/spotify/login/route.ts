import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseService } from "@/lib/supabase/service";
import {
  PKCE_COOKIE,
  STATE_COOKIE,
  buildAuthorizeUrl,
  generateOauthState,
  generatePkceVerifier,
  pkceChallengeFromVerifier,
} from "@/lib/spotify/oauth";

export async function GET(req: Request) {
  const supabase = await getSupabaseServer();

  // S'assurer qu'on a une identité Supabase (anonyme suffit) — sert d'ancrage
  // au player_id et aux tokens chiffrés.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let playerId = user?.id;
  if (!playerId) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      return NextResponse.json(
        { error: `anon_sign_in_failed: ${error?.message ?? "unknown"}` },
        { status: 500 },
      );
    }
    playerId = data.user.id;
  }

  // Garantir le row players (service role, RLS bypass)
  const svc = getSupabaseService();
  await svc.from("players").upsert({ id: playerId }, { onConflict: "id" });

  const verifier = generatePkceVerifier();
  const challenge = pkceChallengeFromVerifier(verifier);
  const state = generateOauthState();

  const url = new URL(req.url);
  const returnTo = url.searchParams.get("return_to") ?? "/";

  const cookieStore = await cookies();
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600, // 10 min
  };
  cookieStore.set(PKCE_COOKIE, verifier, cookieOpts);
  cookieStore.set(STATE_COOKIE, state, cookieOpts);
  cookieStore.set("spotify_return_to", returnTo, cookieOpts);

  const authorizeUrl = buildAuthorizeUrl({
    clientId: process.env.SPOTIFY_CLIENT_ID!,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI!,
    codeChallenge: challenge,
    state,
  });

  console.log("[spotify/login]", {
    request_host: new URL(req.url).host,
    redirect_uri_sent: process.env.SPOTIFY_REDIRECT_URI,
    set_cookies_on_host: new URL(req.url).host,
  });

  return NextResponse.redirect(authorizeUrl);
}
