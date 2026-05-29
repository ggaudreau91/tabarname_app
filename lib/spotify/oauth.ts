// Spotify OAuth PKCE helpers.
// Le code verifier vit dans un cookie httpOnly entre /login et /callback.
// Pas de NextAuth ici — on veut contrôle direct sur le chiffrement du
// refresh token côté serveur.

import { randomBytes, createHash } from "node:crypto";

export const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-modify-playback-state",
  "user-read-playback-state",
  // App Remote (app iOS native via Capacitor): requis pour que le SDK iOS de
  // Spotify puisse télécommander l'app Spotify du téléphone. Sans ce scope,
  // appRemote.connect() échoue. Les users existants doivent re-consentir.
  "app-remote-control",
  // Pour l'import de playlists curées (admin) — depuis nov 2024 Spotify exige
  // un user-token avec ces scopes même pour des playlists publiques.
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

export const PKCE_COOKIE = "spotify_pkce_verifier";
export const STATE_COOKIE = "spotify_oauth_state";

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generatePkceVerifier(): string {
  // 64 bytes → 86 char base64url, dans la plage [43, 128] exigée par RFC 7636
  return base64UrlEncode(randomBytes(64));
}

export function pkceChallengeFromVerifier(verifier: string): string {
  return base64UrlEncode(createHash("sha256").update(verifier).digest());
}

export function generateOauthState(): string {
  return base64UrlEncode(randomBytes(24));
}

export function buildAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state: string;
}): string {
  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("scope", SPOTIFY_SCOPES);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("state", params.state);
  return url.toString();
}

export type SpotifyTokenResponse = {
  access_token: string;
  token_type: "Bearer";
  scope: string;
  expires_in: number;
  refresh_token: string;
};

export async function exchangeCodeForTokens(params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<SpotifyTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    code_verifier: params.codeVerifier,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${params.clientId}:${params.clientSecret}`).toString("base64"),
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Spotify token exchange failed: ${res.status} ${await res.text()}`);
  }

  return (await res.json()) as SpotifyTokenResponse;
}

export async function refreshAccessToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<SpotifyTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: params.clientId,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${params.clientId}:${params.clientSecret}`).toString("base64"),
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Spotify token refresh failed: ${res.status} ${await res.text()}`);
  }

  // Spotify peut omettre refresh_token dans la réponse de refresh → on garde l'ancien
  const data = (await res.json()) as Partial<SpotifyTokenResponse>;
  return {
    access_token: data.access_token!,
    token_type: "Bearer",
    scope: data.scope ?? "",
    expires_in: data.expires_in!,
    refresh_token: data.refresh_token ?? params.refreshToken,
  };
}

export type SpotifyMe = {
  id: string;
  email?: string;
  display_name?: string;
  product: "premium" | "free" | "open";
};

export async function fetchSpotifyMe(accessToken: string): Promise<SpotifyMe> {
  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Spotify /me failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as SpotifyMe;
}
