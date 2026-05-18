import { NextResponse, type NextRequest } from "next/server";

// Force 127.0.0.1 quand l'app est servie sur localhost — Spotify (depuis avril
// 2025) refuse `localhost` comme redirect URI, et nos cookies PKCE sont posés
// sur le domaine de la requête, donc `localhost` et `127.0.0.1` ne partagent
// pas leurs cookies. Si on laisse l'user arriver via `localhost`, le callback
// Spotify échoue avec missing_params.
export function proxy(req: NextRequest) {
  // ⚠️ Next.js 16 (proxy.ts) bug connu: req.nextUrl.hostname retourne toujours
  // 'localhost' même quand la vraie requête est sur 127.0.0.1. On se fie donc
  // EXCLUSIVEMENT à l'en-tête HTTP `host`, qui reflète ce que le browser envoie.
  const host = req.headers.get("host") ?? "";
  if (!host.startsWith("localhost")) {
    return NextResponse.next();
  }

  // Reconstruit l'URL depuis l'en-tête host pour éviter le bug nextUrl.
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const targetHost = host.replace(/^localhost/, "127.0.0.1");
  const target = `${proto}://${targetHost}${req.nextUrl.pathname}${req.nextUrl.search}`;
  console.log("[proxy] redirect localhost →", target);
  return NextResponse.redirect(target, { status: 307 });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
