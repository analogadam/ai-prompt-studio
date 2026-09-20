/**
 * Kanalin sabit sunucusunun referans karesini uretir (Z-Image Turbo, lokal).
 *
 *   node scripts/karakter-portre.mjs ada
 *   node scripts/karakter-portre.mjs ada --sahne "masasinda, iki ekran arkasinda"
 *   node scripts/karakter-portre.mjs ada --seed 7 --cikti deneme.png
 *
 * Karakter tanimi karakterler/<ad>/karakter.json icinde durur: gorunum cumlesi
 * ve tohum (seed) sabit kaldigi surece ayni yuz tekrar uretilebiliyor. Sahne
 * degisse de yuz ayni kaliyor; kanalin tanidik yuzu boyle korunuyor.
 *
 * Uretilen kare dogrudan konusma videosunun referansi olarak kullaniliyor:
 *   node scripts/karakter-video.mjs <video-slug>
 */
import fs from "node:fs";
import path from "node:path";
import { loadWorkflow, runWorkflow, setInput } from "./comfy.mjs";

const KARAKTER_DIR = "karakterler";

/** Her karede tekrar eden cekim dili. Kanalin gorsel imzasi burada. */
const STIL =
  "photorealistic vertical selfie video still, shot on a phone front camera, " +
  "natural daylight, shallow depth of field, casual authentic look, " +
  "looking directly into the camera, mouth slightly open mid-sentence";

/** Yapay zeka goruntulerinin bilindik kusurlari. */
const KUSURLAR =
  "plastic skin, airbrushed, oversaturated, extra fingers, deformed hands, " +
  "text, watermark, logo, cartoon, illustration, blurry";

const fail = (message) => {
  console.error("\nHATA: " + message + "\n");
  process.exit(1);
};

const readFlag = (args, name, fallback) => {
  const index = args.indexOf("--" + name);
  return index === -1 ? fallback : args[index + 1];
};

const main = async () => {
  const args = process.argv.slice(2);
  const ad = args[0];
  if (!ad || ad.startsWith("--")) {
    fail('Kullanim: node scripts/karakter-portre.mjs <karakter-adi> [--sahne "..."] [--seed N]');
  }

  const tanimYolu = path.join(KARAKTER_DIR, ad, "karakter.json");
  if (!fs.existsSync(tanimYolu)) {
    fail(
      "Karakter tanimi yok: " +
        tanimYolu +
        "\n" +
        'Ornek icerik: { "gorunum": "...", "seed": 1, "sahne": "..." }',
    );
  }

  const tanim = JSON.parse(fs.readFileSync(tanimYolu, "utf8"));
  const sahne = readFlag(args, "sahne", tanim.sahne ?? "");
  const seed = Number(readFlag(args, "seed", tanim.seed ?? 1));
  const cikti = readFlag(args, "cikti", path.join(KARAKTER_DIR, ad, "referans.png"));

  const istem = [tanim.gorunum, sahne, STIL].filter(Boolean).join(", ");

  const workflow = loadWorkflow("karakter-portre.api.json");
  setInput(workflow, "olumlu", "text", istem);
  setInput(workflow, "olumsuz", "text", KUSURLAR);
  setInput(workflow, "ornekleyici", "seed", seed);

  console.log("Karakter : " + ad + "  (tohum " + seed + ")");
  console.log("Istem    : " + istem.slice(0, 120) + (istem.length > 120 ? "..." : ""));

  const { seconds } = await runWorkflow(workflow, cikti, "portre uretiliyor");
  console.log("Hazir    : " + cikti + "  (" + seconds.toFixed(1) + " sn)");
};

main();
