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
  /** Lance la lecture d'une URI sur le device courant (PUT /me/player/play) */
  playUri: (uri: string) => Promise<void>;
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

async function fetchAccessToken(): Promise<{
  access_token: string;
  product: "premium" | "free" | "open";
} | null> {
  const res = await fetch("/api/spotify/access-token", { cache: "no-store" });
  if (res.status === 404 || res.status === 401) return null;
  if (!res.ok) throw new Error(`access-token failed: ${res.status}`);
  return res.json();
}

export function SpotifyPlayerProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [product, setProduct] = useState<SpotifyPlayerState["product"]>(null);
  const [error, setError] = useState<string | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const playerRef = useRef<Spotify.Player | null>(null);

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

      player.addListener("ready", ({ device_id }) => {
        console.log("[spotify-sdk] ready", { device_id });
        setDeviceId(device_id);
        setIsReady(true);
      });

      player.addListener("not_ready", ({ device_id }) => {
        console.warn("[spotify-sdk] not_ready", { device_id });
        setIsReady(false);
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

  const playUri = useCallback(async (uri: string) => {
    if (!deviceId) throw new Error("device_id pas encore disponible");
    const tokenData = await fetchAccessToken();
    if (!tokenData) throw new Error("pas de token Spotify");

    console.log("[spotify-sdk] playUri", { uri, deviceId });

    // 1. Transférer la lecture vers notre device (sinon Spotify peut renvoyer
    //    NO_ACTIVE_DEVICE quand l'utilisateur n'a jamais lancé Spotify).
    const transferRes = await fetch("https://api.spotify.com/v1/me/player", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ device_ids: [deviceId], play: false }),
    });
    // 204 OK, 202 Accepted, 404 (no active session) sont tous "acceptables"
    if (!transferRes.ok && transferRes.status !== 404) {
      console.warn(
        "[spotify-sdk] transfer status",
        transferRes.status,
        await transferRes.text(),
      );
    }

    // Petit délai pour laisser Spotify reconnaître le device avant le play
    await new Promise((r) => setTimeout(r, 250));

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
    if (!res.ok && res.status !== 202 && res.status !== 204) {
      const txt = await res.text();
      console.error("[spotify-sdk] playUri failed", res.status, txt);
      throw new Error(`playUri ${res.status}: ${txt}`);
    }
    console.log("[spotify-sdk] playUri OK", res.status);
  }, [deviceId]);

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
      value={{ isReady, deviceId, product, error, playUri, pause }}
    >
      <Script src="https://sdk.scdn.co/spotify-player.js" strategy="afterInteractive" />
      {children}
    </SpotifyPlayerContext.Provider>
  );
}
