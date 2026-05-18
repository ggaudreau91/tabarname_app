import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseService } from "@/lib/supabase/service";
import { parseJson, requireUserId, rpcError } from "@/lib/api";

const Body = z.object({
  pseudo: z.string().min(1).max(40),
  has_premium: z.boolean().default(false),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  const { code } = await ctx.params;
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const body = await parseJson(req, Body);
  if (body instanceof NextResponse) return body;

  const svc = getSupabaseService();
  const { data, error } = await svc.rpc("join_room", {
    p_code: code.toUpperCase(),
    p_player_id: userId,
    p_pseudo: body.pseudo,
    p_has_premium: body.has_premium,
  });
  if (error) return rpcError(error);

  return NextResponse.json({ membership: data });
}
