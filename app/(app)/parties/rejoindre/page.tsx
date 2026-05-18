"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSpotifyPlayer } from "@/components/spotify/SpotifyPlayerProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n";

export default function JoinPartyPage() {
  const router = useRouter();
  const { product } = useSpotifyPlayer();
  const [code, setCode] = useState("");
  const [pseudo, setPseudo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = code.trim().length === 6 && pseudo.trim().length > 0 && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const upper = code.trim().toUpperCase();
      const res = await fetch(`/api/parties/${upper}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pseudo: pseudo.trim(),
          has_premium: product === "premium",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "join_failed");
      router.push(`/parties/${upper}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "erreur");
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">{t("join.title")}</h1>
      <p className="text-muted-foreground mb-8">{t("join.subtitle")}</p>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="code">{t("join.code")}</Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            maxLength={6}
            placeholder="ABCD23"
            className="uppercase tracking-widest font-mono text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pseudo">{t("join.pseudo")}</Label>
          <Input
            id="pseudo"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder={t("create.pseudoPlaceholder")}
            maxLength={40}
          />
        </div>

        {product === null && (
          <p className="text-xs text-muted-foreground">
            {t("join.spotifyOptional")}{" "}
            <a
              href={`/api/spotify/login?return_to=${encodeURIComponent("/parties/rejoindre")}`}
              className="underline"
            >
              {t("spotify.connect")}
            </a>
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={!canSubmit} className="w-full">
          {submitting ? t("join.submitting") : t("join.submit")}
        </Button>
      </form>
    </main>
  );
}
