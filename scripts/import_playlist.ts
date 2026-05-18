/**
 * Import d'une playlist Spotify dans curated_playlists + curated_tracks.
 *
 * Préfigure ce que le futur /admin/playlists (Sprint 4) fera depuis l'UI.
 * Pour playtester le Sprint 3, lance:
 *
 *   pnpm tsx scripts/import_playlist.ts \
 *     --playlist 37i9dQZF1DXcF6B6QPhFDv \
 *     --slug franco-quebec \
 *     --name "Top franco-québécois"
 *
 * Requiert dans .env.local:
 *   - SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET (auth client_credentials)
 *   - NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { createDecipheriv } from "node:crypto";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// Déchiffrement AES-256-GCM identique à lib/spotify/tokens.ts (dupliqué ici
// pour éviter d'importer du code "server-only" dans un script Node).
function decryptToken(ciphertextB64: string, ivB64: string): string {
  const key = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, "hex");
  const buf = Buffer.from(ciphertextB64, "base64");
  const enc = buf.subarray(0, buf.length - 16);
  const tag = buf.subarray(buf.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

type TokenRow = {
  encrypted_access_token: string;
  access_token_iv: string;
  encrypted_refresh_token: string;
  refresh_token_iv: string;
  access_token_expires_at: string;
};

// Refresh + récupération du dernier user-token Spotify lié.
// Depuis nov 2024, l'API playlists exige un user-token (client_credentials = 403).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getUserToken(supabase: any): Promise<string> {
  const { data, error } = await supabase
    .from("spotify_tokens")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`spotify_tokens lookup: ${error.message}`);
  if (!data) {
    throw new Error(
      "Aucun token Spotify en DB. Va sur http://127.0.0.1:3000 et clique 'Connecter Spotify' d'abord.",
    );
  }
  const row = data as unknown as TokenRow;

  const expiresAt = new Date(row.access_token_expires_at);
  if (expiresAt.getTime() - Date.now() > 60_000) {
    return decryptToken(row.encrypted_access_token, row.access_token_iv);
  }

  // Refresh
  const refresh = decryptToken(row.encrypted_refresh_token, row.refresh_token_iv);
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
        ).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh,
      client_id: process.env.SPOTIFY_CLIENT_ID!,
    }),
  });
  if (!res.ok) throw new Error(`refresh: ${res.status} ${await res.text()}`);
  const refreshed = (await res.json()) as { access_token: string };
  return refreshed.access_token;
}

type SpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; release_date: string; images: { url: string }[] };
};

async function spotifyGet(url: string, token: string): Promise<Response> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 403) {
    const body = await res.text();
    console.error(`\n❌ 403 sur ${url}`);
    console.error(`   Réponse: ${body}`);
    console.error(`\nCauses probables:`);
    console.error(`   1. Ton app Spotify est en "Development Mode" → seuls les users explicitement ajoutés dans le dashboard peuvent l'utiliser.`);
    console.error(`      → developer.spotify.com/dashboard → ton app → "User Management" → ajoute ton email Spotify.`);
    console.error(`   2. Le token n'a pas le scope "playlist-read-private" → reconnecte Spotify (Disconnect puis Connecter).`);
    console.error(`   3. La playlist est privée et ce n'est pas la tienne.`);
    throw new Error(`403 Forbidden`);
  }
  if (!res.ok) throw new Error(`${url}: ${res.status} ${await res.text()}`);
  return res;
}

// Spotify a changé la shape en 2026: au top niveau du response, le champ
// `items` est en fait l'objet paginé `{items: [...], next, total}`, et chaque
// entrée porte la piste dans `.item` (et non `.track` comme la doc classique).
// On gère aussi la shape historique `tracks.items[].track` par sécurité.
type PlaylistEntry = { item?: SpotifyTrack | null; track?: SpotifyTrack | null };
type Paginated = { items: PlaylistEntry[]; next: string | null; total?: number };

type PlaylistMeta = {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  tracks?: Paginated;
  items?: Paginated;
};

function extractTrack(entry: PlaylistEntry): SpotifyTrack | null {
  return entry.item ?? entry.track ?? null;
}

async function fetchPlaylistWithTracks(
  playlistId: string,
  token: string,
): Promise<{ meta: PlaylistMeta; tracks: SpotifyTrack[] }> {
  const res = await spotifyGet(
    `https://api.spotify.com/v1/playlists/${playlistId}`,
    token,
  );
  const meta = (await res.json()) as PlaylistMeta;

  const page = meta.tracks ?? meta.items;
  if (!page || !Array.isArray(page.items)) {
    throw new Error("Forme de réponse Spotify inattendue: pas de page de tracks.");
  }

  const tracks: SpotifyTrack[] = [];
  for (const entry of page.items) {
    const t = extractTrack(entry);
    if (t) tracks.push(t);
  }
  const total = page.total ?? tracks.length;

  let next = page.next;
  while (next) {
    try {
      const pageRes = await spotifyGet(next, token);
      const p = (await pageRes.json()) as Paginated;
      for (const entry of p.items) {
        const t = extractTrack(entry);
        if (t) tracks.push(t);
      }
      next = p.next;
    } catch (e) {
      console.warn(
        `\n⚠️  Pagination bloquée — on garde les ${tracks.length} premières pistes sur ${total}.`,
      );
      console.warn(`   (cause: ${e instanceof Error ? e.message : e})`);
      break;
    }
  }

  return { meta, tracks };
}

async function main() {
  const playlistId = arg("playlist");
  const slug = arg("slug");
  const name = arg("name");
  if (!playlistId || !slug) {
    console.error("Usage: --playlist <id> --slug <slug> [--name <nom>]");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const token = await getUserToken(supabase);

  // Affiche les scopes du token en DB pour diagnostiquer 403 sur playlists
  const { data: tokenRow } = await supabase
    .from("spotify_tokens")
    .select("scope, spotify_user_id, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const tokenInfo = tokenRow as { scope?: string; spotify_user_id?: string; updated_at?: string } | null;
  console.log(`Token user: ${tokenInfo?.spotify_user_id ?? "?"}`);
  console.log(`Token scopes: ${tokenInfo?.scope ?? "?"}`);
  console.log(`Token updated: ${tokenInfo?.updated_at ?? "?"}`);
  if (!tokenInfo?.scope?.includes("playlist-read-private")) {
    console.error(
      "\n⚠️  Le scope 'playlist-read-private' manque sur ton token.",
    );
    console.error(
      "   → Reconnecte Spotify dans l'app (http://127.0.0.1:3000 → 'Se connecter avec Spotify') pour obtenir un nouveau token avec les bons scopes.",
    );
    process.exit(1);
  }

  const { meta, tracks } = await fetchPlaylistWithTracks(playlistId, token);

  console.log(`Playlist "${meta.name}" — ${tracks.length} pistes`);

  const { data: pl, error: plErr } = await supabase
    .from("curated_playlists")
    .upsert(
      {
        slug,
        name: name ?? meta.name,
        description: meta.description || null,
        cover_url: meta.images?.[0]?.url ?? null,
        spotify_playlist_id: playlistId,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    )
    .select()
    .single();

  if (plErr) throw plErr;
  console.log(`Playlist row: ${pl.id}`);

  const rows = tracks.map((t: SpotifyTrack) => {
    const year = parseInt((t.album.release_date ?? "0000").slice(0, 4), 10) || 0;
    return {
      playlist_id: pl.id,
      spotify_track_id: t.id,
      spotify_uri: t.uri,
      title: t.name,
      artists: t.artists.map((a: { name: string }) => a.name).join(", "),
      album: t.album.name,
      cover_url: t.album.images?.[0]?.url ?? null,
      spotify_release_year: year,
      effective_year: year,
    };
  });

  const { error: insErr, count } = await supabase
    .from("curated_tracks")
    .upsert(rows, { onConflict: "playlist_id,spotify_track_id", count: "exact" });

  if (insErr) throw insErr;
  console.log(`Pistes importées: ${count ?? rows.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
