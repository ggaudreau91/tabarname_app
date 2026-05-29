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
  title: "Tabarname — Jeu musical multijoueur",
  description:
    "Devine l'année des chansons et construis ta timeline. Jeu musical multijoueur propulsé par Spotify, avec une touche québécoise.",
};

// viewport-fit=cover: nécessaire pour que env(safe-area-inset-*) renvoie les
// vraies marges (Dynamic Island / status bar / home indicator) dans l'app iOS.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2D1B12",
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
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
