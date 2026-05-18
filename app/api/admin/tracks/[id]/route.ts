import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseService } from "@/lib/supabase/service";
import { parseJson, requireUserId } from "@/lib/api";

const Body = z.object({
  effective_year: z.number().int().min(1900).max(2100).optional(),
  notes: z.string().nullable().optional(),
  is_excluded: z.boolean().optional(),
});

function isAdmin(userId: string): boolean {
  const allowList = (process.env.ADMIN_PLAYER_IDS ?? "").split(",").map((s) => s.trim());
  return allowList.includes(userId);
}

// PATCH /api/admin/tracks/[id]
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;
  if (!isAdmin(userId)) return NextResponse.json({ error: "not_admin" }, { status: 403 });

  const body = await parseJson(req, Body);
  if (body instanceof NextResponse) return body;

  const svc = getSupabaseService();
  const { data, error } = await svc
    .from("curated_tracks")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ track: data });
}
