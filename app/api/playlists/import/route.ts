import { NextResponse } from "next/server";
import { z } from "zod";
import {
  importPlaylist,
  parsePlaylistInput,
  slugifyName,
} from "@/lib/curation/import";
import { parseJson, requireUserId } from "@/lib/api";
import { getSupabaseService } from "@/lib/supabase/service";

const Body = z.object({
  input: z.string().min(1),
  /** Optionnel — sinon on slugifie le nom Spotify */
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  name: z.string().optional(),
});

const USER_IMPORT_QUOTA = 10;

// POST /api/playlists/import — import d'une playlist Spotify publique par
// n'importe quel user Premium connecté. Pas de gate ADMIN_PLAYER_IDS.
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await parseJson(req, Body);
  if (body instanceof NextResponse) return body;

  const svc = getSupabaseService();

  // 1. Le user doit être Premium — sans ça il ne pourra pas jouer dans sa
  //    propre partie. Faux-positif acceptable: le check empêche les comptes
  //    free de spammer des imports inutilisables.
  const { data: tokenRow } = await svc
    .from("spotify_tokens")
    .select("product")
    .eq("player_id", userId)
    .maybeSingle();
  if (!tokenRow) {
    return NextResponse.json({ error: "no_spotify_link" }, { status: 403 });
  }
  if (tokenRow.product !== "premium") {
    return NextResponse.json({ error: "premium_required" }, { status: 403 });
  }

  // 2. Quota anti-spam: max N playlists user-imported par compte
  const { count: existingCount } = await svc
    .from("curated_playlists")
    .select("id", { count: "exact", head: true })
    .eq("imported_by", userId)
    .eq("is_user_imported", true);
  if ((existingCount ?? 0) >= USER_IMPORT_QUOTA) {
    return NextResponse.json(
      {
        error: "quota_reached",
        detail: `Maximum ${USER_IMPORT_QUOTA} playlists importées par compte.`,
      },
      { status: 429 },
    );
  }

  // 3. Slug: explicite ou dérivé du nom. On garantit l'unicité en suffixant
  //    avec un fragment court si collision.
  const playlistId = parsePlaylistInput(body.input);
  let slug = body.slug;
  if (!slug) {
    const baseName = body.name?.trim() || playlistId;
    const base = slugifyName(baseName);
    // suffixe court basé sur l'ID Spotify pour réduire la probabilité de collision
    slug = `${base}-${playlistId.slice(0, 6).toLowerCase()}`;
  }

  try {
    const result = await importPlaylist({
      playlistId,
      slug,
      name: body.name,
      actingPlayerId: userId,
      importedBy: userId,
      markActive: true,
      markUserImported: true,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Spotify renvoie 404 pour playlists privées ou supprimées
    if (msg.includes("Spotify 404")) {
      return NextResponse.json(
        { error: "playlist_not_found", detail: "Playlist introuvable ou privée." },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "import_failed", detail: msg },
      { status: 500 },
    );
  }
}
