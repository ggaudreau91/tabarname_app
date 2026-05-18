// Chiffrement AES-256-GCM des tokens Spotify + accès DB via service role.
// Le refresh token ne quitte JAMAIS le serveur. L'access token court-vivant
// est servi au client via /api/spotify/access-token (refresh transparent).

import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getSupabaseService } from "@/lib/supabase/service";
import { refreshAccessToken, type SpotifyTokenResponse } from "./oauth";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("TOKEN_ENCRYPTION_KEY manquant ou mauvaise longueur (attendu: 64 char hex / 32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): { ciphertext: string; iv: string } {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // On préfixe le tag au ciphertext: stockage compact en une seule colonne
  const payload = Buffer.concat([enc, tag]).toString("base64");
  return { ciphertext: payload, iv: iv.toString("base64") };
}

export function decrypt(ciphertextB64: string, ivB64: string): string {
  const buf = Buffer.from(ciphertextB64, "base64");
  const enc = buf.subarray(0, buf.length - TAG_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  scope: string;
  product: "premium" | "free" | "open";
  spotifyUserId: string;
};

export async function saveTokens(playerId: string, tokens: StoredTokens): Promise<void> {
  const access = encrypt(tokens.accessToken);
  const refresh = encrypt(tokens.refreshToken);
  const svc = getSupabaseService();

  const { error } = await svc.from("spotify_tokens").upsert({
    player_id: playerId,
    encrypted_access_token: access.ciphertext,
    access_token_iv: access.iv,
    encrypted_refresh_token: refresh.ciphertext,
    refresh_token_iv: refresh.iv,
    access_token_expires_at: tokens.accessTokenExpiresAt.toISOString(),
    scope: tokens.scope,
    product: tokens.product,
    spotify_user_id: tokens.spotifyUserId,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(`saveTokens: ${error.message}`);
}

type Row = {
  player_id: string;
  encrypted_access_token: string;
  access_token_iv: string;
  encrypted_refresh_token: string;
  refresh_token_iv: string;
  access_token_expires_at: string;
  scope: string;
  product: "premium" | "free" | "open";
  spotify_user_id: string;
};

export async function loadTokensRow(playerId: string): Promise<Row | null> {
  const svc = getSupabaseService();
  const { data, error } = await svc
    .from("spotify_tokens")
    .select("*")
    .eq("player_id", playerId)
    .maybeSingle<Row>();
  if (error) throw new Error(`loadTokensRow: ${error.message}`);
  return data;
}

// Retourne un access token valide. Refresh transparent si expire dans <60s.
export async function getValidAccessToken(playerId: string): Promise<{
  accessToken: string;
  expiresAt: Date;
  product: "premium" | "free" | "open";
} | null> {
  const row = await loadTokensRow(playerId);
  if (!row) return null;

  const expiresAt = new Date(row.access_token_expires_at);
  const expiresSoon = expiresAt.getTime() - Date.now() < 60_000;

  if (!expiresSoon) {
    return {
      accessToken: decrypt(row.encrypted_access_token, row.access_token_iv),
      expiresAt,
      product: row.product,
    };
  }

  const refreshToken = decrypt(row.encrypted_refresh_token, row.refresh_token_iv);
  const refreshed: SpotifyTokenResponse = await refreshAccessToken({
    refreshToken,
    clientId: process.env.SPOTIFY_CLIENT_ID!,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
  });

  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
  await saveTokens(playerId, {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    accessTokenExpiresAt: newExpiresAt,
    scope: refreshed.scope || row.scope,
    product: row.product,
    spotifyUserId: row.spotify_user_id,
  });

  return {
    accessToken: refreshed.access_token,
    expiresAt: newExpiresAt,
    product: row.product,
  };
}
