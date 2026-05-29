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
  /** Connect + Native: devices Spotify Connect dispos pour l'auth user */
  devices: SpotifyConnectDevice[];
  /**
   * Device Connect cible. En mode native, `null` = « cet iPhone » (App Remote);
   * une valeur = transfert vers un device Connect (enceinte, etc.).
   */
  selectedDeviceId: string | null;
  /** Sélectionne un device Connect (chaîne vide ⇒ null ⇒ cet iPhone en natif) */
  selectDevice: (id: string) => void;
  /** Rafraîchit la liste des devices Connect */
  refreshDevices: () => Promise<void>;
  playUri: (uri: string) => Promise<void>;
  ensurePlaying: (uri: string, timeoutMs?: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
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

/**
 * Lance la connexion Spotify selon la plateforme:
 *  - App iOS native: autorisation app-à-app (bascule vers l'app Spotify, sans
 *    username/password). Si Spotify n'est pas installé, fallback login web.
 *  - Web (desktop / iOS Safari): login web PKCE classique.
 * En natif, le succès émet l'event "authorized" → le provider (re)connecte
 * l'App Remote avec le token serveur fraîchement stocké.
 */
export async function connectSpotify(returnTo?: string): Promise<void> {
  const target =
    returnTo ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const webLogin = `/api/spotify/login?return_to=${encodeURIComponent(target)}`;

  if (!Capacitor.isNativePlatform()) {
    window.location.href = webLogin;
    return;
  }

  try {
    const res = await fetch("/api/spotify/native/nonce", { cache: "no-store" });
    if (!res.ok) throw new Error(`nonce failed: ${res.status}`);
    const { nonce } = (await res.json()) as { nonce: string };
    await SpotifyRemote.authorize({ nonce, swapBaseUrl: window.location.origin });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    const msg = e instanceof Error ? e.message : String(e);
    // Spotify pas installé → on retombe sur le login web (autorisé dans la
    // WebView par allowNavigation, cf. capacitor.config.ts).
    if (code === "spotify_not_installed" || /spotify_not_installed|not installed/i.test(msg)) {
      window.location.href = webLogin;
      return;
    }
    throw e;
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
      // En mode native, « cet iPhone » (App Remote) est le défaut: on ne
      // sélectionne PAS automatiquement un device Connect — l'utilisateur choisit.
      if (mode === "native") return;
      // Auto-select (connect): priorité au device déjà actif, puis premier
      // "Smartphone" ou "Speaker", sinon le premier de la liste.
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
  }, [mode]);

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

    // Connecte l'App Remote avec l'access token serveur. No-op s'il n'y a pas
    // encore de lien Spotify (token null) → l'utilisateur déclenchera l'auth
    // app-à-app via connectSpotify(), dont le succès émet "authorized".
    const connectWithServerToken = async () => {
      const tokenData = await fetchAccessToken();
      if (cancelled || !tokenData) return;
      setProduct(tokenData.product);
      try {
        const { connected } = await SpotifyRemote.connect({
          token: tokenData.access_token,
        });
        if (!cancelled) setNativeConnected(connected);
      } catch (e) {
        console.warn("[spotify-native] connect failed", e);
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(`Spotify natif: ${msg}`);
        }
      }
      // Peupler la liste Connect pour permettre de transférer le son vers une
      // enceinte/TV pendant la partie (sans auto-select, cf. refreshDevices).
      if (!cancelled) refreshDevices();
    };

    handles.push(
      SpotifyRemote.addListener("connected", () => setNativeConnected(true)),
      SpotifyRemote.addListener("disconnected", ({ error }) => {
        setNativeConnected(false);
        if (error) console.warn("[spotify-native] disconnected", error);
      }),
      SpotifyRemote.addListener("stateChanged", (st: NativePlayerState) => {
        setIsPlaying(!st.isPaused);
      }),
      // Auth app-à-app réussie: les tokens sont stockés côté serveur → on
      // (re)connecte l'App Remote avec le token serveur.
      SpotifyRemote.addListener("authorized", () => {
        void connectWithServerToken();
      }),
      SpotifyRemote.addListener("authError", ({ error }) => {
        if (!cancelled && error) setError(`Spotify: ${error}`);
      }),
    );

    void connectWithServerToken();

    const devicesPoll = setInterval(() => refreshDevices(), 8000);

    return () => {
      cancelled = true;
      clearInterval(devicesPoll);
      handles.forEach((h) => h.then((handle) => handle.remove()).catch(() => {}));
      SpotifyRemote.disconnect().catch(() => {});
    };
  }, [mode, refreshDevices]);

  // Computed: device cible et ready selon le mode.
  // En natif, selectedDeviceId non-null = transfert vers un device Connect;
  // null = « cet iPhone » (App Remote, deviceId implicite).
  const deviceId = mode === "sdk" ? sdkDeviceId : selectedDeviceId;
  // En natif, on joue via l'App Remote (selectedDeviceId null) → pas besoin de deviceId.
  const useNativeRemote = mode === "native" && !selectedDeviceId;
  const isReady =
    mode === "sdk"
      ? sdkReady
      : mode === "connect"
        ? !!selectedDeviceId
        : nativeConnected || !!selectedDeviceId;

  const playUri = useCallback(
    async (uri: string) => {
      // Natif « cet iPhone »: l'App Remote gère le device (app Spotify du tél.).
      if (useNativeRemote) {
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
          if (mode !== "sdk") setIsPlaying(true);
          return;
        }

        const txt = await res.text();
        lastErr = new Error(`playUri ${res.status}: ${txt}`);
        console.warn("[spotify] playUri attempt failed", res.status, txt);

        if (res.status !== 404 && res.status !== 502 && res.status !== 503) {
          throw lastErr;
        }
        // Connect (ou natif vers device Connect): 404 = device pas actif → on
        // re-fetch et on retry.
        if (mode !== "sdk") {
          await refreshDevices();
        }
      }
      throw lastErr ?? new Error("playUri: retries épuisés");
    },
    [deviceId, mode, refreshDevices, useNativeRemote],
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
    if (useNativeRemote) {
      await SpotifyRemote.pause().catch(() => {});
      setIsPlaying(false);
      return;
    }
    if (mode === "sdk") {
      await playerRef.current?.pause().catch(() => {});
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
    setIsPlaying(false);
  }, [deviceId, mode, useNativeRemote]);

  const resume = useCallback(async () => {
    if (useNativeRemote) {
      await SpotifyRemote.resume().catch(() => {});
      setIsPlaying(true);
      return;
    }
    if (mode === "sdk") {
      await playerRef.current?.resume().catch(() => {});
      return;
    }
    if (!deviceId) return;
    const tokenData = await fetchAccessToken();
    if (!tokenData) return;
    // Reprise sans body = continue la piste en cours sur le device.
    await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );
    setIsPlaying(true);
  }, [deviceId, mode, useNativeRemote]);

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
        resume,
      }}
    >
      {mode === "sdk" && (
        <Script src="https://sdk.scdn.co/spotify-player.js" strategy="afterInteractive" />
      )}
      {children}
    </SpotifyPlayerContext.Provider>
  );
}
