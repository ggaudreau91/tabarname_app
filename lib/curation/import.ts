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
  /** Joueur à enregistrer comme importateur (pour l'attribution UI/quota) */
  importedBy?: string;
  /** Force is_active=true à la création (défaut: false, comportement admin) */
  markActive?: boolean;
  /** Marque la playlist comme imported par un user (défaut: false) */
  markUserImported?: boolean;
}): Promise<{
  playlistRowId: string;
  playlistName: string;
  importedCount: number;
  totalAvailable: number;
}> {
  const tokenInfo = await getValidAccessToken(params.actingPlayerId);
  if (!tokenInfo) throw new Error("Pas de token Spotify lié pour ce joueur");
  const token = tokenInfo.accessToken;

  // Métadonnées (nom, cover, description). Depuis le changement d'API de
  // février 2026, GET /playlists/{id} ne renvoie PLUS le champ `tracks`
  // embarqué — il faut paginer les pistes via /playlists/{id}/items.
  const metaRes = await spotifyGet(
    `https://api.spotify.com/v1/playlists/${params.playlistId}`,
    token,
  );
  const meta = (await metaRes.json()) as PlaylistMeta;

  // Pistes via /items. Spotify ne renvoie le contenu QUE pour les playlists
  // que l'utilisateur possède (ou dont il est collaborateur) — sinon 403.
  // /tracks a été supprimé en février 2026 et renvoie 403 partout.
  const tracks: SpotifyTrack[] = [];
  let next:
    | string
    | null = `https://api.spotify.com/v1/playlists/${params.playlistId}/items?limit=100`;
  let total: number | undefined;
  while (next) {
    const pageRes = await spotifyGet(next, token);
    const page = (await pageRes.json()) as Paginated;
    if (!Array.isArray(page.items)) {
      throw new Error("Forme de réponse Spotify inattendue");
    }
    for (const entry of page.items) {
      const t = extractTrack(entry);
      if (t) tracks.push(t);
    }
    if (total === undefined) total = page.total;
    next = page.next;
  }

  total = total ?? tracks.length;
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
        is_active: params.markActive ?? false,
        is_user_imported: params.markUserImported ?? false,
        imported_by: params.importedBy ?? null,
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
    playlistName: pl.name as string,
    importedCount: rows.length,
    totalAvailable: total,
  };
}

/** Slugifie un nom de playlist en kebab-case ASCII, tronqué. */
export function slugifyName(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "playlist"
  );
}
