import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseService } from "@/lib/supabase/service";

// Helpers communs aux route handlers /api/parties/*

export async function requireUserId(): Promise<string | NextResponse> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  return user.id;
}

export async function loadRoomByCode(code: string) {
  const svc = getSupabaseService();
  const { data, error } = await svc
    .from("rooms")
    .select("id, code, host_player_id, status, mode, current_turn_id")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw new Error(`loadRoomByCode: ${error.message}`);
  return data;
}

export async function parseJson<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
): Promise<z.infer<T> | NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  return parsed.data;
}

// Mappe les codes d'erreur plpgsql vers des réponses HTTP utiles.
const PG_ERROR_MAP: Record<string, { status: number; error: string }> = {
  P0001: { status: 404, error: "room_not_found" },
  P0002: { status: 409, error: "room_not_in_lobby" },
  P0003: { status: 409, error: "no_tracks_available" },
  P0004: { status: 409, error: "need_at_least_two_players" },
  P0005: { status: 404, error: "turn_not_found" },
  P0006: { status: 403, error: "not_active_player" },
  P0007: { status: 409, error: "wrong_phase" },
  P0008: { status: 403, error: "active_cannot_challenge" },
  P0009: { status: 403, error: "not_room_member" },
  P0010: { status: 409, error: "no_guess_recorded" },
  P0011: { status: 409, error: "previous_turn_not_resolved" },
  P0012: { status: 409, error: "no_connected_players" },
  P0013: { status: 409, error: "challenges_disabled" },
};

export function rpcError(rpcError: { code?: string; message: string }): NextResponse {
  const mapped = rpcError.code ? PG_ERROR_MAP[rpcError.code] : undefined;
  if (mapped) {
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
  return NextResponse.json(
    { error: "rpc_error", detail: rpcError.message },
    { status: 500 },
  );
}
