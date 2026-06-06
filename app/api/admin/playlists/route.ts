import { NextResponse } from "next/server";
import { z } from "zod";
import {
  importPlaylist,
  parsePlaylistInput,
  slugifyName,
} from "@/lib/curation/import";
import { SYSTEM_PLAYER_ID } from "@/lib/curation/system";
import { parseJson, requireUserId } from "@/lib/api";

const Body = z.object({
  input: z.string().min(1),
  // Optionnel — sinon dérivé du nom Spotify (comme l'import user).
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  name: z.string().optional(),
});

// Gating: seuls les player_id listés dans ADMIN_PLAYER_IDS (comma-separated)
// peuvent appeler /api/admin/*. À durcir plus tard avec un champ `role` ou
// Supabase RLS si l'app grossit.
function isAdmin(userId: string): boolean {
  const allowList = (process.env.ADMIN_PLAYER_IDS ?? "").split(",").map((s) => s.trim());
  return allowList.includes(userId);
}

// POST /api/admin/playlists — import du CATALOGUE OFFICIEL via le compte système
// Tabarname. Le token utilisé est celui du compte système (SYSTEM_PLAYER_ID),
// pas celui de l'admin: depuis le changement d'API Spotify de février 2026,
// /items ne renvoie le contenu QUE pour les playlists possédées par le compte du
// token. Le compte Tabarname doit donc POSSÉDER la playlist (la dupliquer
// manuellement dans son compte au besoin).
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: "not_admin" }, { status: 403 });
  }

  const body = await parseJson(req, Body);
  if (body instanceof NextResponse) return body;

  const playlistId = parsePlaylistInput(body.input);
  const slug =
    body.slug ?? `${slugifyName(body.name?.trim() || playlistId)}-${playlistId.slice(0, 6).toLowerCase()}`;

  try {
    const result = await importPlaylist({
      playlistId,
      slug,
      name: body.name,
      actingPlayerId: SYSTEM_PLAYER_ID,
      markActive: true,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Pas de token système → le compte Tabarname n'a pas encore été lié.
    if (msg.includes("Pas de token Spotify lié")) {
      return NextResponse.json(
        {
          error: "system_not_linked",
          detail:
            "Le compte Spotify Tabarname n'est pas lié. Lance `pnpm link-system-account` puis réessaie.",
        },
        { status: 409 },
      );
    }
    if (msg.includes("Spotify 404")) {
      return NextResponse.json(
        { error: "playlist_not_found", detail: "Playlist introuvable ou privée." },
        { status: 404 },
      );
    }
    // 403 = le compte Tabarname ne possède pas cette playlist (règle fév. 2026).
    if (msg.includes("Spotify 403")) {
      return NextResponse.json(
        {
          error: "playlist_not_owned",
          detail:
            "Le compte Tabarname ne possède pas cette playlist. Duplique-la d'abord " +
            "dans le compte Tabarname (Spotify → ⋯ → Ajouter à une nouvelle playlist), " +
            "puis importe la copie.",
        },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: "import_failed", detail: msg },
      { status: 500 },
    );
  }
}
