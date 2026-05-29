import type { CapacitorConfig } from "@capacitor/cli";

// Coquille iOS native (Capacitor) pour Tabarname.
//
// Le projet est un VRAI serveur Next 16 (route handlers + auth Supabase côté
// serveur) → pas d'export statique possible. La WebView charge donc directement
// le site hébergé via `server.url`. La couche native n'ajoute qu'un pont vers le
// Spotify iOS SDK (App Remote) pour la lecture sur l'iPhone.
//
// Définir CAP_SERVER_URL à l'URL de prod avant `npx cap sync`, ex:
//   CAP_SERVER_URL=https://tabarname.example.com npx cap sync ios
const serverUrl = process.env.CAP_SERVER_URL ?? "https://CHANGEME-tabarname.example.com";

const config: CapacitorConfig = {
  appId: "net.pardesign.tabarname",
  appName: "Tabarname",
  // Requis par le CLI même si on charge un site distant; sert de repli.
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: false,
  },
  ios: {
    // Le scheme de redirection App Remote est aussi déclaré dans Info.plist.
    scheme: "Tabarname",
  },
};

export default config;
