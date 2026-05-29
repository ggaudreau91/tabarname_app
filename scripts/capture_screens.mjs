import pw from "/Users/gabrielgaudreau/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.js";
const { chromium } = pw;
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3100";
const OUT = "./screenshots";
const PLAYLIST_ID = "c9931feb-7531-43bd-8782-40ca260889c6";

const iphone = {
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
};

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ ...iphone, locale: "fr-CA" });
const page = await context.newPage();
page.on("console", (m) => {
  if (m.type() === "error") console.log("  [page error]", m.text().slice(0, 160));
});

// Masque l'indicateur dev de Next.js (le bouton "N" / le toast "1 Issue")
const HIDE_DEVTOOLS = `
  nextjs-portal { display: none !important; }
  [data-nextjs-toast], #__next-build-watcher { display: none !important; }
`;

async function hideDevtools() {
  await page.addStyleTag({ content: HIDE_DEVTOOLS }).catch(() => {});
}

async function shot(name, url, waitMs = 3000) {
  if (url) {
    try {
      await page.goto(BASE + url, { waitUntil: "load", timeout: 20000 });
    } catch (e) {
      console.log(`  goto ${url} -> ${e.message.split("\n")[0]}`);
    }
  }
  await page.waitForTimeout(waitMs);
  await hideDevtools();
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log("captured", name, url ? "<- " + url : "(current view)");
}

// --- Pages statiques ---
await shot("01-accueil", "/");
await shot("02-nouvelle-partie", "/parties/nouvelle");
await shot("03-rejoindre", "/parties/rejoindre");
await shot("04-compte", "/compte");
await shot("05-admin-playlists", "/admin/playlists");
await shot("06-admin-playlist-detail", "/admin/playlists/" + PLAYLIST_ID);

// --- Crée une vraie partie (mode local_pass) via l'API avec la session anonyme ---
await page.goto(BASE + "/parties/nouvelle", { waitUntil: "load", timeout: 20000 });
await page.waitForTimeout(2000);

const created = await page.evaluate(async (pid) => {
  const res = await fetch("/api/parties", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "local_pass",
      playlist_id: pid,
      win_condition_cards: 10,
      turn_seconds: 30,
      local_players: ["Mononc'", "Ti-Gars", "La Boss", "Chouette"],
    }),
  });
  return { status: res.status, body: await res.json() };
}, PLAYLIST_ID);
console.log("create party ->", created.status, JSON.stringify(created.body).slice(0, 200));

const code = created.body?.room?.code;
if (code) {
  await shot("07-lobby", "/parties/" + code, 3500);

  const started = await page.evaluate(async (c) => {
    const res = await fetch(`/api/parties/${c}/start`, { method: "POST" });
    return { status: res.status, body: await res.json() };
  }, code);
  console.log("start game ->", started.status, JSON.stringify(started.body).slice(0, 200));

  await page.waitForTimeout(2000);
  await shot("08-en-jeu-passe-appareil", "/parties/" + code, 4000);

  // Mode local_pass: clique "Je suis prêt" pour révéler la vraie vue de jeu
  // (carte mystère, panneau audio, timeline).
  try {
    const ready = page.getByRole("button", { name: /je suis pr/i });
    await ready.click({ timeout: 5000 });
    await page.waitForTimeout(3000);
    await shot("09-en-jeu-carte", null, 0);
  } catch (e) {
    console.log("  'Je suis prêt' introuvable:", e.message.split("\n")[0]);
  }
} else {
  console.log("!! pas de code de salle, vue de jeu sautée");
}

await browser.close();
console.log("\nDone. Screenshots in", OUT);
