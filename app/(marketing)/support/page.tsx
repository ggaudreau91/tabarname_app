import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support — Tabarname",
  description: "Besoin d’aide avec Tabarname ? Contacte-nous.",
};

const p: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.6,
  color: "var(--ink-2)",
  margin: "0 0 12px",
};

export default function SupportPage() {
  return (
    <main className="tb" style={{ minHeight: "100%", background: "var(--bg-grad)", color: "var(--ink)" }}>
      <div className="safe-top safe-bottom" style={{ padding: "16px 22px 48px", maxWidth: 720, margin: "0 auto" }}>
        <Link href="/" className="tb-mono" style={{ fontSize: 12, color: "var(--accent)" }}>
          ← Tabarname
        </Link>

        <h1 className="font-display" style={{ fontWeight: 700, fontSize: 40, letterSpacing: "-0.01em", margin: "18px 0 6px" }}>
          Support
        </h1>

        <p style={p}>
          Une question, un bogue, une suggestion ? Écris-nous, on répond vite :
        </p>
        <p style={{ ...p, marginBottom: 24 }}>
          <a href="mailto:ggaudreau@pardesign.net" className="tb-btn tb-btn--accent" style={{ textDecoration: "none" }}>
            ggaudreau@pardesign.net
          </a>
        </p>

        <h2 style={{ fontWeight: 700, fontSize: 22, color: "var(--ink)", margin: "26px 0 10px" }}>
          Avant de jouer
        </h2>
        <p style={p}>
          Tabarname utilise <b style={{ color: "var(--ink)" }}>Spotify</b> pour la
          musique. Il faut un compte <b style={{ color: "var(--ink)" }}>Premium</b>{" "}
          et, sur iPhone, l’application Spotify installée (c’est elle qui joue le
          son). Connecte ton compte Spotify depuis la page{" "}
          <Link href="/compte" style={{ color: "var(--accent)" }}>
            Mon compte
          </Link>
          .
        </p>

        <div className="tb-mono" style={{ display: "flex", gap: 14, marginTop: 28, fontSize: 12, color: "var(--ink-dim)" }}>
          <Link href="/legal/confidentialite" style={{ color: "var(--ink-dim)" }}>Confidentialité</Link>
          <Link href="/legal/conditions" style={{ color: "var(--ink-dim)" }}>Conditions</Link>
        </div>
      </div>
    </main>
  );
}
