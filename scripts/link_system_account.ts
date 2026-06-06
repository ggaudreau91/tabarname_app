/**
 * Lie le compte Spotify OFFICIEL Tabarname (« compte système ») et stocke son
 * token sous player_id = SYSTEM_PLAYER_ID. Ce token sert à importer le catalogue
 * officiel (lire /items des playlists que CE compte possède). À lancer UNE fois
 * par l'équipe (ré-exécutable pour re-lier).
 *
 *   pnpm link-system-account
 *
 * Pré-requis:
 *   1. Enregistrer le Redirect URI loopback dans le Spotify Developer Dashboard:
 *        http://127.0.0.1:8899/callback
 *      (Dashboard → ton app → Settings → Redirect URIs → Add)
 *   2. .env / .env.local: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET,
 *      TOKEN_ENCRYPTION_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Au moment de l'autorisation, connecte-toi avec le COMPTE TABARNAME OFFICIEL
 * (pas ton compte perso) — c'est ce compte qui devra posséder les playlists du
 * catalogue.
 */

import { createClient } from "@supabase/supabase-js";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";

// DOIT rester identique à lib/curation/system.ts et la migration 0014.
const SYSTEM_PLAYER_ID = "00000000-0000-4000-8000-000000000001";

const REDIRECT_PORT = 8899;
const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}/callback`;

// Scopes — sous-ensemble suffisant pour lire ses propres playlists privées.
// (Identique à SPOTIFY_SCOPES côté app, dont playlist-read-private.)
const SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-read-email",
  "user-read-private",
].join(" ");

function base64Url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Chiffrement AES-256-GCM identique à lib/spotify/tokens.ts (dupliqué pour
// éviter d'importer du code "server-only" dans un script Node).
function encrypt(plaintext: string): { ciphertext: string; iv: string } {
  const key = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, "hex");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([enc, tag]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
};

function waitForCode(expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", REDIRECT_URI);
      if (url.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const err = url.searchParams.get("error");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      if (err || !code) {
        res.end(`<h1>Échec</h1><p>${err ?? "code manquant"}. Tu peux fermer cet onglet.</p>`);
        server.close();
        reject(new Error(`Autorisation refusée: ${err ?? "code manquant"}`));
        return;
      }
      if (state !== expectedState) {
        res.end("<h1>Échec</h1><p>state invalide (CSRF). Tu peux fermer cet onglet.</p>");
        server.close();
        reject(new Error("state mismatch"));
        return;
      }
      res.end("<h1>✓ Compte Tabarname lié</h1><p>Tu peux fermer cet onglet et revenir au terminal.</p>");
      server.close();
      resolve(code);
    });
    server.on("error", reject);
    server.listen(REDIRECT_PORT, "127.0.0.1");
  });
}

async function main() {
  for (const k of ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!process.env[k]) {
      console.error(`❌ Variable d'env manquante: ${k}`);
      process.exit(1);
    }
  }
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

  // 1. PKCE + state
  const verifier = base64Url(randomBytes(64));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  const state = base64Url(randomBytes(24));

  // 2. URL d'autorisation
  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("state", state);

  console.log("\n┌─ Liaison du compte Spotify OFFICIEL Tabarname ─────────────");
  console.log("│ Assure-toi d'avoir enregistré ce Redirect URI dans le dashboard:");
  console.log(`│   ${REDIRECT_URI}`);
  console.log("│");
  console.log("│ Ouvre cette URL et CONNECTE-TOI AVEC LE COMPTE TABARNAME OFFICIEL:");
  console.log(`│\n${authUrl.toString()}\n`);
  console.log("└─ En attente du retour de Spotify sur le port 8899…\n");

  // 3. Attendre le code via loopback
  const code = await waitForCode(state);

  // 4. Échange code → tokens (PKCE + client_secret confidentiel)
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: clientId,
      code_verifier: verifier,
    }),
  });
  if (!tokenRes.ok) {
    console.error(`❌ Échange de code échoué: ${tokenRes.status} ${await tokenRes.text()}`);
    process.exit(1);
  }
  const tokens = (await tokenRes.json()) as TokenResponse;

  // 5. Profil du compte lié
  const meRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!meRes.ok) {
    console.error(`❌ /me échoué: ${meRes.status} ${await meRes.text()}`);
    process.exit(1);
  }
  const me = (await meRes.json()) as { id: string; product?: string };

  // 6. Chiffrer + upsert sous SYSTEM_PLAYER_ID
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // S'assurer que la ligne players système existe (idempotent — cf. migration 0014)
  await supabase.from("players").upsert(
    { id: SYSTEM_PLAYER_ID, display_name: "Tabarname (système)" },
    { onConflict: "id" },
  );

  const access = encrypt(tokens.access_token);
  const refresh = encrypt(tokens.refresh_token);
  const { error } = await supabase.from("spotify_tokens").upsert({
    player_id: SYSTEM_PLAYER_ID,
    encrypted_access_token: access.ciphertext,
    access_token_iv: access.iv,
    encrypted_refresh_token: refresh.ciphertext,
    refresh_token_iv: refresh.iv,
    access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    scope: tokens.scope,
    product: me.product ?? "open",
    spotify_user_id: me.id,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error(`❌ Upsert spotify_tokens échoué: ${error.message}`);
    process.exit(1);
  }

  console.log(`\n✅ Compte Tabarname lié: spotify_user_id = "${me.id}" (product: ${me.product ?? "open"})`);
  console.log(`   Stocké sous player_id système ${SYSTEM_PLAYER_ID}.`);
  console.log(`   Tu peux maintenant importer le catalogue officiel depuis /admin/playlists.\n`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
