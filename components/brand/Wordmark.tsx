/* eslint-disable @next/next/no-img-element */

// Logo officiel Tabarname (lockup pastille rayée + mot-symbole), version crème
// pour les fonds sombres "Nuit de vinyle". Sert dans les en-têtes d'écran.
export function Wordmark({ height = 24 }: { height?: number }) {
  return (
    <img
      src="/brand/logo-creme.svg"
      alt="Tabarname"
      style={{ height, width: "auto", display: "block" }}
    />
  );
}
