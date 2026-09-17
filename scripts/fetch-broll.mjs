/**
 * Pexels'ten dikey b-roll klibi indirir ve videonun kendi medya klasorune
 * (public/<video-slug>/) koyar.
 *
 *   node scripts/fetch-broll.mjs "ekran karti" vram-mi-islemci-mi gpu-kapak
 *   node scripts/fetch-broll.mjs "data center servers" ssd-neden-yavaslar raf --pick 2
 *
 * Pexels lisansi ticari kullanima ve atifsiz yayina izin verir; indirilen
 * klipler kanalda dogrudan kullanilabilir.
 *
 * Anahtar: https://www.pexels.com/api/ adresinden ucretsiz alinir ve
 * PEXELS_API_KEY ortam degiskenine ya da proje kokundeki .env dosyasina
 * yazilir. Anahtar depoya girmemeli (.env zaten .gitignore icinde).
 */
import fs from "node:fs";
import path from "node:path";
import { readApiKey } from "./env.mjs";

const PUBLIC_DIR = "public";
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MIN_WIDTH = 1080;
const SEARCH_URL = "https://api.pexels.com/videos/search";

const fail = (message) => {
  console.error("\nHATA: " + message + "\n");
  process.exit(1);
};


/**
 * Dikey ve yeterince genis olan en iyi dosyayi secer.
 * Pexels her video icin birden cok cozunurluk dondurur; Shorts icin 1080
 * genisligin altina inilmez, gereksiz buyuk dosya da indirilmez.
 */
const pickVideoFile = (video) => {
  const vertical = video.video_files
    .filter((file) => file.height > file.width && file.width >= MIN_WIDTH)
    .sort((a, b) => a.width - b.width);
  return vertical[0] ?? null;
};

const [query, videoSlug, clipName, ...flags] = process.argv.slice(2);
if (!query || !videoSlug || !clipName) {
  fail('Kullanim: node scripts/fetch-broll.mjs "<arama>" <video-slug> <klip-adi> [--pick N]');
}
for (const name of [videoSlug, clipName]) {
  if (!SLUG_PATTERN.test(name)) {
    fail("Ad yalnizca kucuk harf, rakam ve tire icermeli: " + name);
  }
}
const targetDir = path.join(PUBLIC_DIR, videoSlug);

const pickIndex = Math.max(1, Number(flags[flags.indexOf("--pick") + 1]) || 1) - 1;
const apiKey = readApiKey(
  "PEXELS_API_KEY",
  "https://www.pexels.com/api/ adresinden ucretsiz alinir.",
);

const url = new URL(SEARCH_URL);
url.searchParams.set("query", query);
url.searchParams.set("orientation", "portrait");
url.searchParams.set("per_page", "15");

const response = await fetch(url, { headers: { Authorization: apiKey } });
if (!response.ok) {
  fail("Pexels istegi basarisiz (" + response.status + "): " + (await response.text()).slice(0, 200));
}

const { videos } = await response.json();
const usable = videos.map((video) => ({ video, file: pickVideoFile(video) })).filter((x) => x.file);

if (usable.length === 0) {
  fail('"' + query + '" icin 1080 genisliginde dikey klip bulunamadi. Baska bir arama deneyin.');
}

console.log("\n" + usable.length + " uygun klip bulundu:");
usable.forEach(({ video, file }, index) => {
  const mark = index === pickIndex ? ">" : " ";
  console.log(
    "  " + mark + " " + (index + 1) + ". " + file.width + "x" + file.height +
      ", " + video.duration + " sn, " + video.user.name + " -- " + video.url,
  );
});

const chosen = usable[Math.min(pickIndex, usable.length - 1)];
const target = path.join(targetDir, clipName + ".mp4");

console.log("\nIndiriliyor: " + target);
const clip = await fetch(chosen.file.link);
if (!clip.ok) fail("Klip indirilemedi (" + clip.status + ")");

fs.mkdirSync(targetDir, { recursive: true });
fs.writeFileSync(target, Buffer.from(await clip.arrayBuffer()));

const sizeMb = (fs.statSync(target).size / (1024 * 1024)).toFixed(1);
console.log("Bitti: " + target + " (" + sizeMb + " MB, " + chosen.video.duration + " sn)");
console.log('Brief icinde kullanim: { "type": "broll", "src": "' + clipName + '.mp4" }');
