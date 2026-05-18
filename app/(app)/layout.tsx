"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import { SpotifyPlayerProvider } from "@/components/spotify/SpotifyPlayerProvider";

// Wrapper client: garantit une session Supabase (anonyme par défaut) puis
// monte le SpotifyPlayerProvider. Tant que la session n'est pas prête, on
// affiche un placeholder pour éviter que les enfants tentent des requêtes
// authentifiées avant l'auth.
export default function AppLayout({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        await supabase.auth.signInAnonymously();
      }
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Initialisation…
      </div>
    );
  }

  return <SpotifyPlayerProvider>{children}</SpotifyPlayerProvider>;
}
