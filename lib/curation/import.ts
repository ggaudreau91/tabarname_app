// Logique d'import de playlist Spotify dans curated_playlists + curated_tracks.
// Réutilisé par le script CLI et la route /api/admin/playlists/import.

import "server-only";
import { getValidAccessToken } from "@/lib/spotify/tokens";
import { getSupabaseService } from "@/lib/supabase/service";

type SpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; release_date: string; images: { url: string }[] };
};

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

async function spotifyGet(url: string, token: string): Promise<Response> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Spotify ${res.status} sur ${url}: ${await res.text()}`);
  }
  return res;
}

/** Normalise un input qui peut être un ID, une URL `open.spotify.com/playlist/<id>`
 *  ou un URI `spotify:playlist:<id>`. */
export function parsePlaylistInput(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/playlist[/:]([A-Za-z0-9]+)/);
  if (urlMatch) return urlMatch[1];
  return trimmed;
}

export async function importPlaylist(params: {
  playlistId: string;
  slug: string;
  name?: string;
  /** ID du joueur dont le token Spotify est utilisé pour l'API */
  actingPlayerId: string;
}): Promise<{
  playlistRowId: string;
  importedCount: number;
  totalAvailable: number;
}> {
  const tokenInfo = await getValidAccessToken(params.actingPlayerId);
  if (!tokenInfo) throw new Error("Pas de token Spotify lié pour ce joueur");
  const token = tokenInfo.accessToken;

  const metaRes = await spotifyGet(
    `https://api.spotify.com/v1/playlists/${params.playlistId}`,
    token,
  );
  const meta = (await metaRes.json()) as PlaylistMeta;

  const firstPage = meta.tracks ?? meta.items;
  if (!firstPage || !Array.isArray(firstPage.items)) {
    throw new Error("Forme de réponse Spotify inattendue");
  }

  const tracks: SpotifyTrack[] = [];
  for (const entry of firstPage.items) {
    const t = extractTrack(entry);
    if (t) tracks.push(t);
  }

  let next = firstPage.next;
  while (next) {
    try {
      const pageRes = await spotifyGet(next, token);
      const page = (await pageRes.json()) as Paginated;
      for (const entry of page.items) {
        const t = extractTrack(entry);
        if (t) tracks.push(t);
      }
      next = page.next;
    } catch {
      // Pagination peut être bloquée — on garde ce qu'on a
      break;
    }
  }

  const total = firstPage.total ?? tracks.length;
  const svc = getSupabaseService();

  const { data: pl, error: plErr } = await svc
    .from("curated_playlists")
    .upsert(
      {
        slug: params.slug,
        name: params.name ?? meta.name,
        description: meta.description || null,
        cover_url: meta.images?.[0]?.url ?? null,
        spotify_playlist_id: params.playlistId,
        is_active: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    )
    .select()
    .single();
  if (plErr) throw new Error(`upsert playlist: ${plErr.message}`);

  const rows = tracks.map((t) => {
    const year = parseInt((t.album.release_date ?? "0000").slice(0, 4), 10) || 0;
    return {
      playlist_id: pl.id,
      spotify_track_id: t.id,
      spotify_uri: t.uri,
      title: t.name,
      artists: t.artists.map((a) => a.name).join(", "),
      album: t.album.name,
      cover_url: t.album.images?.[0]?.url ?? null,
      spotify_release_year: year,
      effective_year: year,
    };
  });

  // Stratégie d'import: INSERT avec ON CONFLICT DO NOTHING — préserve les
  // effective_year overridés par le curateur. Pour resync complet, supprimer
  // la playlist et réimporter.
  if (rows.length > 0) {
    const { error: insErr } = await svc
      .from("curated_tracks")
      .upsert(rows, {
        onConflict: "playlist_id,spotify_track_id",
        ignoreDuplicates: true,
      });
    if (insErr) throw new Error(`insert tracks: ${insErr.message}`);
  }

  return {
    playlistRowId: pl.id,
    importedCount: rows.length,
    totalAvailable: total,
  };
}
