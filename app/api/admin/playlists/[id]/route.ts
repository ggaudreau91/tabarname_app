import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseService } from "@/lib/supabase/service";
import { parseJson, requireUserId } from "@/lib/api";

const Body = z.object({
  is_active: z.boolean().optional(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

function isAdmin(userId: string): boolean {
  const allowList = (process.env.ADMIN_PLAYER_IDS ?? "").split(",").map((s) => s.trim());
  return allowList.includes(userId);
}

// PATCH /api/admin/playlists/[id]
// Autorisé pour: les admins (sur tout) OU le user qui a importé la playlist.
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await parseJson(req, Body);
  if (body instanceof NextResponse) return body;

  const svc = getSupabaseService();

  if (!isAdmin(userId)) {
    const { data: pl } = await svc
      .from("curated_playlists")
      .select("imported_by")
      .eq("id", id)
      .maybeSingle();
    if (!pl || pl.imported_by !== userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const { data, error } = await svc
    .from("curated_playlists")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ playlist: data });
}
