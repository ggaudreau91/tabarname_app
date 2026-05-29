import Link from "next/link";
import { VinylDisc } from "@/components/brand/VinylDisc";
import { Kicker } from "@/components/brand/Kicker";
import { Wordmark } from "@/components/brand/Wordmark";

const ARTISTS = [
  "Beau Dommage", "Les Cowboys Fringants", "Harmonium", "Cœur de pirate",
  "Les Colocs", "Jean Leloup", "Marie-Mai", "Robert Charlebois",
  "Loud", "FouKi", "Diane Dufresne", "Kaïn", "Les Trois Accords",
];

const HOWTO = [
  {
    n: "01",
    t: "Crée la salle",
    d: "L'hôte ouvre une partie, choisit une playlist et partage le code à 6 caractères.",
  },
  {
    n: "02",
    t: "Écoute, devine, place",
    d: "Une chanson joue. Devine son année et glisse la carte au bon endroit dans ta timeline.",
  },
  {
    n: "03",
    t: "Conteste ou tabarne",
    d: "Pas d'accord avec un placement? Conteste. T'as raison, tu rafles la carte. Premier à 10 cartes gagne.",
  },
];

function HowStep({ n, title, body, last }: { n: string; title: string; body: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 16, paddingBottom: last ? 0 : 18 }}>
      <div
        className="font-display"
        style={{
          fontWeight: 700, fontSize: 40, color: "var(--gold)", lineHeight: 0.9,
          width: 56, flexShrink: 0, fontVariantNumeric: "lining-nums",
        }}
      >
        {n}
      </div>
      <div>
        <div
          className="font-display"
          style={{ fontWeight: 600, fontSize: 18, color: "var(--ink)", marginBottom: 4 }}
        >
          {title}
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--ink-2)" }}>{body}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const marquee = [...ARTISTS, ...ARTISTS];
  return (
    <main
      className="tb flex-1"
      style={{ minHeight: "100%", background: "var(--bg-grad)", color: "var(--ink)" }}
    >
      <div className="safe-top" style={{ padding: "16px 22px 40px" }}>
        {/* top bar */}
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 26 }}
        >
          <Wordmark height={26} />
          <Link
            href="/compte"
            className="tb-mono"
            style={{
              fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
              color: "var(--ink-dim)", border: "1px solid var(--line)", borderRadius: 999,
              padding: "7px 12px", whiteSpace: "nowrap",
            }}
          >
            Compte
          </Link>
        </div>

        {/* hero */}
        <div style={{ position: "relative" }}>
          <div
            style={{ position: "absolute", right: -90, top: -40, opacity: 0.5, pointerEvents: "none" }}
          >
            <VinylDisc size={240} spinning />
          </div>
          <Kicker rule style={{ marginBottom: 14 }}>
            Vinyl Club · MTL
          </Kicker>
          <h1
            className="font-display italic"
            style={{
              fontWeight: 700, fontSize: 42, lineHeight: 1.02, letterSpacing: "-0.015em",
              color: "var(--ink)", position: "relative", paddingBottom: 2,
            }}
          >
            Devine l&apos;année.
            <br />
            <span style={{ color: "var(--accent)" }}>
              Bâtis ta
              <br />
              timeline.
            </span>
          </h1>
          <p
            style={{
              fontSize: 14.5, lineHeight: 1.55, color: "var(--ink-2)",
              marginTop: 18, maxWidth: 320, position: "relative",
            }}
          >
            Un jeu musical multijoueur propulsé par Spotify pour les soirées qui finissent
            tard. Écoute un extrait, devine sa date de sortie, glisse-la dans ta timeline.
          </p>
        </div>

        {/* primary actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 22 }}>
          <Link href="/parties/nouvelle" className="tb-btn tb-btn--accent tb-btn--block">
            <span style={{ display: "inline-flex", fontSize: "0.9em" }}>＋</span>
            <span>Créer une partie</span>
          </Link>

          {/* join code row — contained, no overflow */}
          <form
            action="/parties/rejoindre"
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--surface)", border: "1.5px solid var(--line)",
              borderRadius: 14, padding: "6px 6px 6px 14px",
            }}
          >
            <span
              className="tb-mono"
              style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--ink-dim)", flexShrink: 0 }}
            >
              CODE
            </span>
            <input
              name="code"
              placeholder="EMB-543"
              className="tb-mono"
              style={{
                flex: 1, minWidth: 0, border: "none", background: "transparent", outline: "none",
                fontSize: 17, letterSpacing: "0.08em", color: "var(--ink)", padding: "8px 0",
                textTransform: "uppercase",
              }}
            />
            <button
              type="submit"
              aria-label="Rejoindre"
              style={{
                width: 40, height: 40, borderRadius: 10, background: "var(--ink)",
                color: "var(--bg)", flexShrink: 0, fontSize: 18, display: "flex",
                alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer",
              }}
            >
              →
            </button>
          </form>

          <div
            style={{
              display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 2,
            }}
          >
            <span
              style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--spotify)", flexShrink: 0 }}
            />
            <span style={{ fontSize: 12.5, color: "var(--ink-dim)" }}>
              Propulsé par Spotify · Compte Premium requis
            </span>
          </div>
        </div>
      </div>

      {/* marquee */}
      <div
        style={{
          overflow: "hidden", width: "100%", background: "var(--panel)",
          borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)",
          padding: "12px 0",
        }}
      >
        <div className="tb-marquee-track">
          {marquee.map((a, i) => (
            <span
              key={i}
              className="font-display italic"
              style={{ fontSize: 18, color: "var(--gold-soft)", padding: "0 18px", opacity: 0.85 }}
            >
              {a}
              <span style={{ color: "var(--gold)", marginLeft: 36 }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* comment ça marche */}
      <div style={{ padding: "26px 22px 8px" }}>
        <Kicker style={{ marginBottom: 10 }}>Comment ça marche</Kicker>
        <h2
          className="font-display"
          style={{ fontWeight: 700, fontSize: 28, color: "var(--ink)", marginBottom: 22, letterSpacing: "-0.01em" }}
        >
          Trois <span style={{ fontStyle: "italic", color: "var(--accent)" }}>tours</span>, puis on joue.
        </h2>
        {HOWTO.map((s, i) => (
          <HowStep key={s.n} n={s.n} title={s.t} body={s.d} last={i === HOWTO.length - 1} />
        ))}
      </div>

      {/* footer CTA */}
      <div
        className="safe-bottom"
        style={{ padding: "20px 22px 30px", display: "flex", flexDirection: "column", gap: 10 }}
      >
        <Link href="/parties/nouvelle" className="tb-btn tb-btn--accent tb-btn--block">
          Créer une partie
        </Link>
        <Link href="/parties/rejoindre" className="tb-btn tb-btn--ghost tb-btn--block">
          Rejoindre avec un code
        </Link>
        <div
          className="tb-mono"
          style={{
            textAlign: "center", fontSize: 10.5, letterSpacing: "0.14em",
            color: "var(--ink-dim)", textTransform: "uppercase", marginTop: 8,
          }}
        >
          Fait à MTL · Côté A · 2026
        </div>
      </div>
    </main>
  );
}
