# App iOS native (Capacitor) — étapes à finir sur ta machine

L'échafaudage est en place (coquille Capacitor + plugin Swift `SpotifyRemote`).
Il reste des étapes qui exigent **Xcode complet** + un **compte Apple Developer**
et ne peuvent pas être faites ailleurs que sur ton Mac.

## Rappel important
Le SDK iOS de Spotify (App Remote) **télécommande** l'app Spotify : l'app Spotify
doit rester **installée** sur l'iPhone et un compte **Premium** est requis. C'est
elle qui joue le son. L'app native évite juste le sélecteur manuel et réveille
Spotify automatiquement.

## Prérequis
- **Xcode complet** (App Store), puis `sudo xcode-select -s /Applications/Xcode.app`.
- Un **compte Apple Developer** (99 $US/an) pour tester sur un vrai iPhone.
- Tester sur un **iPhone réel** (le simulateur n'a pas l'app Spotify).

## 1. URL de prod
La WebView charge le site hébergé. Définir l'URL avant chaque sync :
```bash
CAP_SERVER_URL=https://TON-URL-DE-PROD npx cap sync ios
```
(ou exporter `CAP_SERVER_URL` dans ton shell). Voir `capacitor.config.ts`.

## 2. Ajouter le Spotify iOS SDK (Swift Package Manager)
Dans Xcode : ouvrir `ios/App/App.xcodeproj` → **File ▸ Add Package Dependencies**
→ `https://github.com/spotify/ios-sdk` → ajouter le produit **SpotifyiOS** à la
cible **App**. (Alternative : glisser `SpotifyiOS.xcframework` manuellement.)

## 3. Renseigner le client ID
Dans `ios/App/App/Info.plist`, remplacer `REMPLACER_PAR_LE_CLIENT_ID_SPOTIFY`
par le **même client ID Spotify** que le web. Le `SpotifyRedirectURL` est déjà
réglé à `tabarname-spotify://callback`.

## 4. Spotify Developer Dashboard
Sur https://developer.spotify.com/dashboard, dans l'app Spotify existante :
- **Redirect URIs** : ajouter `tabarname-spotify://callback`.
- **iOS ▸ Bundle ID** : ajouter `net.pardesign.tabarname` (ou ton Bundle ID).
- Vérifier que le scope `app-remote-control` est permis (déjà demandé côté web).

## 5. Scope OAuth (déjà fait côté code)
`app-remote-control` a été ajouté à `lib/spotify/oauth.ts`. Les utilisateurs
existants doivent **se reconnecter à Spotify une fois** pour accorder ce scope.

## 6. Signing & build
Dans Xcode → cible **App** → **Signing & Capabilities** : choisir ton équipe
Apple. Vérifier que **Background Modes ▸ Audio** est coché (déjà dans Info.plist).
Brancher l'iPhone, sélectionner l'appareil, **Run** (▶).

## 7. Tester
- L'app ouvre le site, détecte le natif (`mode === "native"`).
- Au premier `connect`, si Spotify n'est pas lancé, il est réveillé puis autorisé.
- Lancer une partie : la piste joue sur l'iPhone **sans** sélecteur de device.
- Tester pause/reprise, et le retour d'arrière-plan (le SDK se reconnecte).

## Distribution
TestFlight pour les beta-testeurs, puis soumission App Store. Les apps
« Spotify-powered » sont permises si conformes aux Spotify Developer Terms.

## Fichiers natifs clés
- `ios/App/App/SpotifyRemotePlugin.swift` — le pont App Remote.
- `ios/App/App/AppDelegate.swift` — route le callback du redirect URI.
- `ios/App/App/Info.plist` — client ID, redirect, schemes, background audio.
- `capacitor.config.ts` (racine) — `server.url`, appId, scheme.
- `components/spotify/nativeSpotifyRemote.ts` — interface JS du plugin.
