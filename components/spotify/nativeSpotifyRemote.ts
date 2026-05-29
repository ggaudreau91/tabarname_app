import { registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

// Interface JS du plugin natif maison (impl. Swift dans ios/App/App/
// SpotifyRemotePlugin.swift). Ce plugin télécommande l'app Spotify de l'iPhone
// via le Spotify iOS SDK (App Remote). Il n'existe QUE sur la coquille
// Capacitor iOS — sur le web normal, Capacitor.isNativePlatform() est false et
// on ne touche jamais à ce module.

export type NativePlayerState = {
  isPaused: boolean;
  trackUri: string | null;
  positionMs: number;
};

export interface SpotifyRemotePlugin {
  /**
   * Autorisation app-à-app: bascule vers l'app Spotify installée (« Accepter »,
   * sans username/password). Le SDK POST le code à
   * `{swapBaseUrl}/api/spotify/native/token-swap?nonce={nonce}` qui stocke les
   * tokens côté serveur. Rejette avec le code "spotify_not_installed" si l'app
   * Spotify n'est pas installée → le JS retombe sur le login web.
   */
  authorize(options: {
    nonce: string;
    swapBaseUrl: string;
  }): Promise<{ authorized: boolean }>;
  /**
   * Connecte l'App Remote. Si l'app Spotify n'est pas lancée, le natif appelle
   * authorizeAndPlayURI pour la réveiller. `token` = access token Spotify
   * (scope app-remote-control requis), fourni par /api/spotify/access-token.
   */
  connect(options: { token: string }): Promise<{ connected: boolean }>;
  disconnect(): Promise<void>;
  playUri(options: { uri: string }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  getState(): Promise<NativePlayerState>;

  addListener(
    eventName: "connected",
    listener: () => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "disconnected",
    listener: (data: { error?: string }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "stateChanged",
    listener: (state: NativePlayerState) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "authorized",
    listener: () => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "authError",
    listener: (data: { error?: string }) => void,
  ): Promise<PluginListenerHandle>;
}

export const SpotifyRemote = registerPlugin<SpotifyRemotePlugin>("SpotifyRemote");
