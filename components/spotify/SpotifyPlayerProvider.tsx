"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Script from "next/script";

// État exposé par le provider — minimal: ready/device_id/product/erreurs.
type SpotifyPlayerState = {
  isReady: boolean;
  deviceId: string | null;
  product: "premium" | "free" | "open" | null;
  error: string | null;
  /** True quand le SDK reporte que la piste joue réellement (pas en pause). */
  isPlaying: boolean;
  /** Lance la lecture d'une URI sur le device courant (PUT /me/player/play) */
  playUri: (uri: string) => Promise<void>;
  /**
   * Lance + confirme que la lecture a démarré dans la fenêtre `timeoutMs`.
   * Retry interne sur NO_ACTIVE_DEVICE. Lève si la lecture ne démarre pas.
   */
  ensurePlaying: (uri: string, timeoutMs?: number) => Promise<void>;
  /** Stoppe la lecture */
  pause: () => Promise<void>;
};

const SpotifyPlayerContext = createContext<SpotifyPlayerState | null>(null);

export function useSpotifyPlayer(): SpotifyPlayerState {
  const ctx = useContext(SpotifyPlayerContext);
  if (!ctx) {
    throw new Error("useSpotifyPlayer doit être utilisé à l'intérieur de SpotifyPlayerProvider");
  }
  return ctx;
}

/**
 * Heuristique pour détecter les browsers où le Web Playback SDK est cassé ou
 * très instable. Pas un bloc — sert à afficher un nudge UX vers le mode
 * "host_audio".
 */
export function isLikelySdkUnsupported(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  // Sur iOS, *tous* les browsers utilisent WebKit; le SDK reste cassé même
  // dans Chrome iOS / Firefox iOS.
  return isIOS;
}

async function fetchAccessToken(): Promise<{
  access_token: string;
  product: "premium" | "free" | "open";
} | null> {
  const res = await fetch("/api/spotify/access-token", { cache: "no-store" });
  if (res.status === 404 || res.status === 401) return null;
  if (!res.ok) throw new Error(`access-token failed: ${res.status}`);
  return res.json();
}

async function transferPlayback(token: string, deviceId: string): Promise<void> {
  const res = await fetch("https://api.spotify.com/v1/me/player", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ device_ids: [deviceId], play: false }),
  });
  // 204 OK, 202 Accepted, 404 (no active session) sont tous "acceptables"
  if (!res.ok && res.status !== 404) {
    console.warn("[spotify-sdk] transfer status", res.status, await res.text());
  }
}

export function SpotifyPlayerProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [product, setProduct] = useState<SpotifyPlayerState["product"]>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const playerRef = useRef<Spotify.Player | null>(null);
  const eagerTransferredRef = useRef(false);

  // 1. Le SDK appelle ce callback global une fois chargé
  useEffect(() => {
    window.onSpotifyWebPlaybackSDKReady = () => setSdkLoaded(true);
  }, []);

  // 2. Quand le SDK est chargé, on instancie le Player
  useEffect(() => {
    if (!sdkLoaded) return;

    let cancelled = false;

    (async () => {
      const tokenData = await fetchAccessToken();
      if (cancelled) return;
      if (!tokenData) {
        // Pas de lien Spotify — pas un crash, juste pas de player
        return;
      }
      setProduct(tokenData.product);

      const player = new window.Spotify.Player({
        name: "Tabarname",
        getOAuthToken: async (cb) => {
          const fresh = await fetchAccessToken();
          if (fresh) cb(fresh.access_token);
        },
        volume: 0.5,
      });

      player.addListener("ready", async ({ device_id }) => {
        console.log("[spotify-sdk] ready", { device_id });
        setDeviceId(device_id);
        setIsReady(true);

        // Eager transfer: on revendique le device immédiatement, sans attendre
        // le premier playUri. Évite NO_ACTIVE_DEVICE au premier play.
        if (eagerTransferredRef.current) return;
        eagerTransferredRef.current = true;
        try {
          const t = await fetchAccessToken();
          if (t) {
            await transferPlayback(t.access_token, device_id);
            console.log("[spotify-sdk] eager transfer ok");
          }
        } catch (e) {
          console.warn("[spotify-sdk] eager transfer failed", e);
        }
      });

      player.addListener("not_ready", ({ device_id }) => {
        console.warn("[spotify-sdk] not_ready", { device_id });
        setIsReady(false);
        eagerTransferredRef.current = false;
      });

      player.addListener("initialization_error", ({ message }) => {
        console.error("[spotify-sdk] init_error", message);
        setError(`Init: ${message}`);
      });
      player.addListener("authentication_error", ({ message }) => {
        console.error("[spotify-sdk] auth_error", message);
        setError(`Auth: ${message}`);
      });
      player.addListener("account_error", ({ message }) => {
        console.error("[spotify-sdk] account_error", message);
        setError(`Compte: ${message} (Premium requis)`);
      });
      player.addListener("playback_error", ({ message }) => {
        console.error("[spotify-sdk] playback_error", message);
        setError(`Lecture: ${message}`);
      });

      // player_state_changed: source de vérité sur isPlaying. null = pas de
      // contexte actif (state suspendu / device pas owner).
      player.addListener("player_state_changed", (state) => {
        if (!state) {
          setIsPlaying(false);
          return;
        }
        setIsPlaying(!state.paused);
      });

      const ok = await player.connect();
      if (!ok) setError("Échec de la connexion au Web Playback SDK");

      playerRef.current = player;
    })();

    return () => {
      cancelled = true;
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [sdkLoaded]);

  const playUri = useCallback(
    async (uri: string) => {
      if (!deviceId) throw new Error("device_id pas encore disponible");
      const tokenData = await fetchAccessToken();
      if (!tokenData) throw new Error("pas de token Spotify");

      const backoffs = [0, 350, 800];
      let lastErr: unknown = null;

      for (let attempt = 0; attempt < backoffs.length; attempt++) {
        if (backoffs[attempt] > 0) {
          // Avant un retry, on refait un transfer — souvent le device s'est
          // désynchronisé entre deux appels.
          await transferPlayback(tokenData.access_token, deviceId);
          await new Promise((r) => setTimeout(r, backoffs[attempt]));
        }
        console.log("[spotify-sdk] playUri attempt", attempt + 1, { uri, deviceId });

        const res = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ uris: [uri] }),
          },
        );

        if (res.ok || res.status === 202 || res.status === 204) {
          console.log("[spotify-sdk] playUri OK", res.status);
          return;
        }

        const txt = await res.text();
        lastErr = new Error(`playUri ${res.status}: ${txt}`);
        console.warn("[spotify-sdk] playUri attempt failed", res.status, txt);

        // Retry uniquement sur NO_ACTIVE_DEVICE (404) ou erreurs transitoires.
        if (res.status !== 404 && res.status !== 502 && res.status !== 503) {
          throw lastErr;
        }
      }
      throw lastErr ?? new Error("playUri: retries épuisés");
    },
    [deviceId],
  );

  const ensurePlaying = useCallback(
    async (uri: string, timeoutMs = 3500) => {
      await playUri(uri);

      // Attend que le SDK confirme la lecture (event player_state_changed),
      // via un polling rapide du player state — plus fiable que d'attendre
      // un re-render du context.
      const player = playerRef.current;
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (player) {
          const st = await player.getCurrentState().catch(() => null);
          if (st && !st.paused) {
            return;
          }
        } else if (isPlaying) {
          return;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      throw new Error("playback_not_confirmed");
    },
    [playUri, isPlaying],
  );

  const pause = useCallback(async () => {
    if (!deviceId) return;
    const tokenData = await fetchAccessToken();
    if (!tokenData) return;
    await fetch(
      `https://api.spotify.com/v1/me/player/pause?device_id=${encodeURIComponent(deviceId)}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );
  }, [deviceId]);

  return (
    <SpotifyPlayerContext.Provider
      value={{ isReady, deviceId, product, error, isPlaying, playUri, ensurePlaying, pause }}
    >
      <Script src="https://sdk.scdn.co/spotify-player.js" strategy="afterInteractive" />
      {children}
    </SpotifyPlayerContext.Provider>
  );
}
