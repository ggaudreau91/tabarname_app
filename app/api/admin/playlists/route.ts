import { NextResponse } from "next/server";
import { z } from "zod";
import { importPlaylist, parsePlaylistInput } from "@/lib/curation/import";
import { parseJson, requireUserId } from "@/lib/api";

const Body = z.object({
  input: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().optional(),
});

// Gating: seuls les player_id listés dans ADMIN_PLAYER_IDS (comma-separated)
// peuvent appeler /api/admin/*. À durcir plus tard avec un champ `role` ou
// Supabase RLS si l'app grossit.
function isAdmin(userId: string): boolean {
  const allowList = (process.env.ADMIN_PLAYER_IDS ?? "").split(",").map((s) => s.trim());
  return allowList.includes(userId);
}

// POST /api/admin/playlists — import via API Spotify
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: "not_admin" }, { status: 403 });
  }

  const body = await parseJson(req, Body);
  if (body instanceof NextResponse) return body;

  try {
    const result = await importPlaylist({
      playlistId: parsePlaylistInput(body.input),
      slug: body.slug,
      name: body.name,
      actingPlayerId: userId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: "import_failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
