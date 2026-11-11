import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

// Fraunces — display serif chaleureux, variable, idéal pour les titres
// et le branding "vinyl club québécois".
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

// JetBrains Mono — pour les codes de salle, MetaLabels, tampons typo.
const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tabarname-app.vercel.app"),
  title: "Tabarname — Jeu musical multijoueur",
  description:
    "Devine l'année des chansons et construis ta timeline. Jeu musical multijoueur propulsé par Spotify, avec une touche québécoise.",
  openGraph: {
    title: "Tabarname — Jeu musical multijoueur",
    description:
      "Devine l'année, bâtis ta timeline. Le jeu musical de party propulsé par Spotify, version québécoise.",
    type: "website",
    locale: "fr_CA",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tabarname — Jeu musical multijoueur",
    description:
      "Devine l'année, bâtis ta timeline. Le jeu musical de party propulsé par Spotify.",
  },
  appleWebApp: {
    capable: true,
    title: "Tabarname",
    statusBarStyle: "black-translucent",
  },
};

// viewport-fit=cover: nécessaire pour que env(safe-area-inset-*) renvoie les
// vraies marges (Dynamic Island / status bar / home indicator) dans l'app iOS.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A1220",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${fraunces.variable} ${mono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col font-sans"
        style={{ background: "#070b12" }}
      >
        {/* .tb-shell (globals.css): pleine largeur partout — téléphones,
            iPhone Duo déplié (~990 pt en paysage!), tablettes. La colonne
            centrée n'existe que sur un navigateur de bureau (≥ 1024 px). */}
        <div
          className="tb tb-shell mx-auto flex w-full flex-1 flex-col"
          style={{
            background: "var(--bg)",
            color: "var(--ink)",
          }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}
