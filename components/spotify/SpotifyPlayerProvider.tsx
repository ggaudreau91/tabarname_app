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
import { Capacitor } from "@capacitor/core";
import { SpotifyRemote, type NativePlayerState } from "./nativeSpotifyRemote";

export type SpotifyConnectDevice = {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
};

// État exposé par le provider. On supporte trois backends de lecture:
//  - SDK (desktop): le browser EST le device → deviceId fourni par le SDK.
//  - Connect (iOS web): le user choisit un device externe (son app Spotify
//    mobile); devices/selectedDeviceId/refreshDevices sont alors les sources de
//    vérité.
//  - Native (app iOS Capacitor): le Spotify iOS SDK (App Remote) télécommande
//    directement l'app Spotify du téléphone; pas de device picker.
type SpotifyPlayerState = {
  /** Vrai mode de lecture pour ce browser */
  mode: "sdk" | "connect" | "native";
  /** SDK ready (mode=sdk) OU device sélectionné (mode=connect) */
  isReady: boolean;
  /** Device qui sera la cible des play calls */
  deviceId: string | null;
  product: "premium" | "free" | "open" | null;
  error: string | null;
  isPlaying: boolean;
  /** Mode Connect uniquement: devices Spotify dispos pour l'auth user */
  devices: SpotifyConnectDevice[];
  /** Mode Connect uniquement: id du device cible (Spotify app mobile, etc.) */
  selectedDeviceId: string | null;
  /** Mode Connect uniquement: sélectionne un device */
  selectDevice: (id: string) => void;
  /** Mode Connect uniquement: rafraîchit la liste des devices */
  refreshDevices: () => Promise<void>;
  playUri: (uri: string) => Promise<void>;
  ensurePlaying: (uri: string, timeoutMs?: number) => Promise<void>;
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
 * iOS Safari (et tous les browsers iOS, qui utilisent WebKit) ne supportent
 * pas correctement le Web Playback SDK. On force le mode Connect.
 */
export function isLikelySdkUnsupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
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
  if (!res.ok && res.status !== 404) {
    console.warn("[spotify] transfer status", res.status, await res.text());
  }
}

export function SpotifyPlayerProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"sdk" | "connect" | "native">("sdk");
  const [sdkDeviceId, setSdkDeviceId] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [product, setProduct] = useState<SpotifyPlayerState["product"]>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [devices, setDevices] = useState<SpotifyConnectDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [nativeConnected, setNativeConnected] = useState(false);
  const playerRef = useRef<Spotify.Player | null>(null);
  const eagerTransferredRef = useRef(false);

  // 1. Mode-detection au mount: app native Capacitor → "native", iOS web →
  //    "connect", sinon "sdk".
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      queueMicrotask(() => setMode("native"));
    } else if (isLikelySdkUnsupported()) {
      queueMicrotask(() => setMode("connect"));
    }
  }, []);

  // 2. SDK loader — uniquement si mode=sdk
  useEffect(() => {
    if (mode !== "sdk") return;
    window.onSpotifyWebPlaybackSDKReady = () => setSdkLoaded(true);
  }, [mode]);

  // 3. SDK instantiation — uniquement si mode=sdk
  useEffect(() => {
    if (mode !== "sdk") return;
    if (!sdkLoaded) return;

    let cancelled = false;

    (async () => {
      const tokenData = await fetchAccessToken();
      if (cancelled) return;
      if (!tokenData) return;
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
        setSdkDeviceId(device_id);
        setSdkReady(true);

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
        setSdkReady(false);
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
  }, [mode, sdkLoaded]);

  // 4. Connect mode: hydrate product + devices
  const refreshDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify/devices", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { devices: SpotifyConnectDevice[] };
      setDevices(data.devices);
      // Auto-select: priorité au device déjà actif, puis premier "Smartphone"
      // ou "Speaker", sinon le premier de la liste.
      setSelectedDeviceId((current) => {
        if (current && data.devices.some((d) => d.id === current)) return current;
        const active = data.devices.find((d) => d.is_active);
        if (active) return active.id;
        const phone = data.devices.find(
          (d) => d.type === "Smartphone" || d.type === "Speaker",
        );
        if (phone) return phone.id;
        return data.devices[0]?.id ?? null;
      });
    } catch (e) {
      console.warn("[spotify-connect] refresh devices failed", e);
    }
  }, []);

  useEffect(() => {
    if (mode !== "connect") return;
    let cancelled = false;
    (async () => {
      const tokenData = await fetchAccessToken();
      if (cancelled) return;
      if (tokenData) setProduct(tokenData.product);
      await refreshDevices();
    })();
    // Refresh périodique tant que pas de device sélectionné — utile quand le
    // user ouvre Spotify sur son iPhone après avoir chargé la page.
    const id = setInterval(() => {
      refreshDevices();
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [mode, refreshDevices]);

  // 5. Native mode (Capacitor iOS): connecte l'App Remote et écoute son état.
  useEffect(() => {
    if (mode !== "native") return;
    let cancelled = false;
    const handles: Array<Promise<{ remove: () => void }>> = [];

    (async () => {
      const tokenData = await fetchAccessToken();
      if (cancelled) return;
      if (tokenData) setProduct(tokenData.product);
      if (!tokenData) return;

      handles.push(
        SpotifyRemote.addListener("connected", () => setNativeConnected(true)),
        SpotifyRemote.addListener("disconnected", ({ error }) => {
          setNativeConnected(false);
          if (error) console.warn("[spotify-native] disconnected", error);
        }),
        SpotifyRemote.addListener("stateChanged", (st: NativePlayerState) => {
          setIsPlaying(!st.isPaused);
        }),
      );

      try {
        const { connected } = await SpotifyRemote.connect({
          token: tokenData.access_token,
        });
        if (!cancelled) setNativeConnected(connected);
      } catch (e) {
        console.warn("[spotify-native] connect failed", e);
        if (!cancelled) {
          setError("Connexion à Spotify échouée. Spotify est-il installé ?");
        }
      }
    })();

    return () => {
      cancelled = true;
      handles.forEach((h) => h.then((handle) => handle.remove()).catch(() => {}));
      SpotifyRemote.disconnect().catch(() => {});
    };
  }, [mode]);

  // Computed: device cible et ready selon le mode
  const deviceId =
    mode === "sdk" ? sdkDeviceId : mode === "connect" ? selectedDeviceId : null;
  const isReady =
    mode === "sdk"
      ? sdkReady
      : mode === "connect"
        ? !!selectedDeviceId
        : nativeConnected;

  const playUri = useCallback(
    async (uri: string) => {
      // Native: l'App Remote gère le device (l'app Spotify du téléphone).
      if (mode === "native") {
        await SpotifyRemote.playUri({ uri });
        setIsPlaying(true);
        return;
      }
      if (!deviceId) throw new Error("aucun device disponible");
      const tokenData = await fetchAccessToken();
      if (!tokenData) throw new Error("pas de token Spotify");

      const backoffs = [0, 350, 800];
      let lastErr: unknown = null;

      for (let attempt = 0; attempt < backoffs.length; attempt++) {
        if (backoffs[attempt] > 0) {
          await transferPlayback(tokenData.access_token, deviceId);
          await new Promise((r) => setTimeout(r, backoffs[attempt]));
        }
        console.log("[spotify] playUri attempt", attempt + 1, { uri, deviceId, mode });

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
          console.log("[spotify] playUri OK", res.status);
          if (mode === "connect") setIsPlaying(true);
          return;
        }

        const txt = await res.text();
        lastErr = new Error(`playUri ${res.status}: ${txt}`);
        console.warn("[spotify] playUri attempt failed", res.status, txt);

        if (res.status !== 404 && res.status !== 502 && res.status !== 503) {
          throw lastErr;
        }
        // En mode connect, 404 = device pas actif → on re-fetch et on retry
        if (mode === "connect") {
          await refreshDevices();
        }
      }
      throw lastErr ?? new Error("playUri: retries épuisés");
    },
    [deviceId, mode, refreshDevices],
  );

  const ensurePlaying = useCallback(
    async (uri: string, timeoutMs = 3500) => {
      await playUri(uri);

      // En mode SDK, on confirme via getCurrentState() du player local.
      // En mode connect/native, le player local n'existe pas — on se fie au fait
      // que la commande de lecture a réussi (204 côté device, ou App Remote).
      if (mode !== "sdk") return;

      const player = playerRef.current;
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (player) {
          const st = await player.getCurrentState().catch(() => null);
          if (st && !st.paused) return;
        } else if (isPlaying) {
          return;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      throw new Error("playback_not_confirmed");
    },
    [playUri, isPlaying, mode],
  );

  const pause = useCallback(async () => {
    if (mode === "native") {
      await SpotifyRemote.pause().catch(() => {});
      setIsPlaying(false);
      return;
    }
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
    if (mode === "connect") setIsPlaying(false);
  }, [deviceId, mode]);

  return (
    <SpotifyPlayerContext.Provider
      value={{
        mode,
        isReady,
        deviceId,
        product,
        error,
        isPlaying,
        devices,
        selectedDeviceId,
        selectDevice: setSelectedDeviceId,
        refreshDevices,
        playUri,
        ensurePlaying,
        pause,
      }}
    >
      {mode === "sdk" && (
        <Script src="https://sdk.scdn.co/spotify-player.js" strategy="afterInteractive" />
      )}
      {children}
    </SpotifyPlayerContext.Provider>
  );
}
