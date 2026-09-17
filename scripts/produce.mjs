/**
 * Bir brief dosyasindan bitmis Shorts uretir:
 * seslendirme -> altyazi -> zamanlama -> video verisi -> kayit defteri -> render.
 *
 *   node scripts/produce.mjs src/videos/ornek/brief.json
 *   node scripts/produce.mjs src/videos/ornek/brief.json --no-render
 *
 * Bir videonun butun dosyalari kendi klasorunde durur:
 *   src/videos/<slug>/   brief.json, video.ts, captions.json
 *   public/<slug>/       vo.mp3 ve b-roll klipleri (staticFile buradan okur)
 *
 * Brief alanlari:
 *   slug          Dosya ve kompozisyon adinin kaynagi ("vram-mi-islemci-mi")
 *   narration     Seslendirilecek tam metin
 *   scenes        VideoData.scenes ile ayni yapi
 *   title         (istege bagli) uretilen dosyaya yazilan aciklama
 *   format        varsayilan "reels"
 *   voice / rate  edge-tts sesi ve hizi
 *   replace       ["soylenen=yazilan", ...] altyazi duzeltmeleri
 *   background    VideoData.background
 *   autoFit       false verilmedikce sahne sureleri seslendirmeye oturtulur
 *
 * edge_tts paketi Python 3.14 kurulumunda; baska bir yorumlayici gerekirse
 * PYTHON ortam degiskeniyle verilir.
 */
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { applyLexicon } from "./lexicon.mjs";

const PYTHON = process.env.PYTHON ?? "python";
const DEFAULT_TRANSITION_IN_SECONDS = 0.4;
const FPS = 30;
const SHORTS_LIMIT_IN_SECONDS = 60;
const CAPTIONS_TOKEN = "__CAPTIONS__";

const fail = (message) => {
  console.error("\nHATA: " + message + "\n");
  process.exit(1);
};

const toPascalCase = (slug) =>
  slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");

/**
 * Medya dosyalari public/<slug>/ altinda durur. Brief icinde yalnizca dosya
 * adi yazilir ("ekran-karti.mp4"); staticFile'in bekledigi klasorlu yol burada
 * kurulur. Zaten klasor iceren degerler oldugu gibi birakilir.
 */
const toMediaPath = (slug, file) => (file.includes("/") ? file : slug + "/" + file);

/** Kareye oturtur: ara degerler sahne sinirlarinda yarim kare kaymaya yol acar. */
const toFrameExact = (seconds) => Math.round(seconds * FPS) / FPS;

const readBrief = (briefPath) => {
  if (!fs.existsSync(briefPath)) fail("Brief bulunamadi: " + briefPath);

  let brief;
  try {
    brief = JSON.parse(fs.readFileSync(briefPath, "utf8"));
  } catch (error) {
    fail("Brief gecerli JSON degil: " + error.message);
  }

  for (const field of ["slug", "narration", "scenes"]) {
    if (!brief[field]) fail("Brief icinde " + field + " alani eksik");
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(brief.slug)) {
    fail("slug yalnizca kucuk harf, rakam ve tire icermeli: " + brief.slug);
  }
  if (!Array.isArray(brief.scenes) || brief.scenes.length === 0) {
    fail("Brief icinde en az bir sahne olmali");
  }
  return brief;
};

/** edge-tts ile seslendirme + kelime zamanli altyazi uretir; konusma suresini dondurur. */
const synthesizeVoiceover = (brief, paths) => {
  // Kisaltmalar okunuslariyla seslendirilir, altyazida dogru yazima doner.
  const spoken = applyLexicon(brief.narration, brief.lexicon);
  if (spoken.replace.length > 0) {
    console.log("   telaffuz: " + spoken.replace.map((r) => r.split("=")[1]).join(", "));
  }

  const textFile = path.join(os.tmpdir(), "produce-" + brief.slug + "-" + Date.now() + ".txt");
  fs.writeFileSync(textFile, spoken.narration, "utf8");

  const args = [
    "scripts/tts.py",
    "--text-file",
    textFile,
    "--audio-out",
    paths.audio,
    "--captions-out",
    paths.captions,
    "--voice",
    brief.voice ?? "tr-TR-AhmetNeural",
    "--rate",
    brief.rate ?? "+0%",
  ];
  // Sozluk kurallari once gelir; brief'in kendi kurallari onlari tamamlar.
  for (const rule of [...spoken.replace, ...(brief.replace ?? [])]) args.push("--replace", rule);

  let output;
  try {
    output = execFileSync(PYTHON, args, { encoding: "utf8" });
  } catch (error) {
    fail(
      "Seslendirme basarisiz. edge_tts kurulu bir Python gerekli.\n" +
        "Denenen yorumlayici: " +
        PYTHON +
        " (PYTHON degiskeniyle degistirilebilir)\n" +
        (error.stderr ?? error.message),
    );
  } finally {
    fs.rmSync(textFile, { force: true });
  }

  const match = output.match(/speechEndMs=(\d+)/);
  if (!match) fail("tts.py konusma suresini bildirmedi:\n" + output);
  return Number(match[1]) / 1000;
};

/**
 * TransitionSeries'te her gecis komsu iki sahneden calindigi icin video,
 * sahne surelerinin toplamindan gecisler kadar kisadir.
 */
const totalTransitionSeconds = (brief) =>
  (brief.transitionInSeconds ?? DEFAULT_TRANSITION_IN_SECONDS) *
  Math.max(0, brief.scenes.length - 1);

const videoDurationInSeconds = (brief) =>
  brief.scenes.reduce((sum, scene) => sum + toFrameExact(scene.durationInSeconds), 0) -
  totalTransitionSeconds(brief);

/**
 * Sahne surelerini seslendirmeye oranli olceklendirir.
 *
 * Senaryoyu yazan (insan ya da model) sahne surelerini tahminen verir; gercek
 * konusma suresi ancak seslendirme uretildikten sonra bilinir. Oranlari
 * koruyarak olceklemek, her videoda elle zamanlama ayari yapmaktan iyidir.
 */
const fitScenesToSpeech = (brief, speechSeconds) => {
  const target = speechSeconds + totalTransitionSeconds(brief);
  const current = brief.scenes.reduce((sum, scene) => sum + scene.durationInSeconds, 0);
  const factor = target / current;

  brief.scenes = brief.scenes.map((scene) => {
    const scaled = { ...scene, durationInSeconds: toFrameExact(scene.durationInSeconds * factor) };
    // Sahne icindeki belirme zamanlari da ayni oranda kayar; yoksa sahne
    // uzarken maddeler basta kumelenip sonu bos kalir.
    if (Array.isArray(scene.revealAtSeconds)) {
      scaled.revealAtSeconds = scene.revealAtSeconds.map((t) => toFrameExact(t * factor));
    }
    return scaled;
  });

  console.log("   sahne sureleri %" + ((factor - 1) * 100).toFixed(1) + " olceklendi");
};

/** Render'a girmeden once anlatimin kesilmesi ya da sonda sessizlik kalmasi yakalanir. */
const checkTiming = (brief, speechSeconds) => {
  const videoSeconds = videoDurationInSeconds(brief);
  const drift = videoSeconds - speechSeconds;

  console.log("   seslendirme : " + speechSeconds.toFixed(1) + " sn");
  console.log("   video       : " + videoSeconds.toFixed(1) + " sn");

  if (drift < -0.15) {
    fail(
      "Video seslendirmeden " +
        Math.abs(drift).toFixed(1) +
        " sn kisa -- anlatim yarida kesilir.\n" +
        "Sahne sureleri toplami " +
        (speechSeconds + totalTransitionSeconds(brief)).toFixed(1) +
        " sn olmali.",
    );
  }
  if (drift > 1.5) {
    console.warn("   UYARI: sonda " + drift.toFixed(1) + " sn sessizlik var.");
  }
  if (videoSeconds > SHORTS_LIMIT_IN_SECONDS) {
    fail("Video " + videoSeconds.toFixed(1) + " sn -- Shorts sinirini (60 sn) asiyor.");
  }
};

/**
 * Video verisini src/videos/<slug>/video.ts olarak yazar.
 *
 * captions alani JSON icine gomulemez; uretilen captions.json dosyasindan
 * import edilmelidir. Once bir isaretci yazilip sonra degisken adiyla
 * degistirmek, elle string birlestirmekten guvenli.
 */
const writeVideoFile = (brief, paths, sourceBrief) => {
  const data = {
    format: brief.format ?? "reels",
    ...(brief.background
      ? {
          background: brief.background.src
            ? { ...brief.background, src: toMediaPath(brief.slug, brief.background.src) }
            : brief.background,
        }
      : {}),
    ...(brief.transitionInSeconds !== undefined
      ? { transitionInSeconds: brief.transitionInSeconds }
      : {}),
    ...(brief.progressBar !== undefined ? { progressBar: brief.progressBar } : {}),
    voiceoverSrc: toMediaPath(brief.slug, path.basename(paths.audio)),
    scenes: brief.scenes.map((scene) =>
      scene.src ? { ...scene, src: toMediaPath(brief.slug, scene.src) } : scene,
    ),
    captions: CAPTIONS_TOKEN,
  };

  const body = JSON.stringify(data, null, 2).replace(JSON.stringify(CAPTIONS_TOKEN), "captions");

  const lines = [
    'import type { VideoData } from "../../scenes/types";',
    'import captions from "./captions.json";',
    "",
    "// URETILMIS DOSYA -- kaynak brief: " + path.basename(sourceBrief),
  ];
  if (brief.title) lines.push("/** " + brief.title + " */");
  lines.push("const video: VideoData = " + body + ";", "", "export default video;", "");

  fs.writeFileSync(paths.videoFile, lines.join("\n"), "utf8");
};

/**
 * Alt komutu kabukta calistirir (Windows'ta npx bir .cmd dosyasidir, kabuksuz
 * cagrilamaz). Argumanlar kabuga tek metin olarak gider; bu yuzden komut
 * satirina yalnizca slug'dan turetilen yollar konur ve slug readBrief icinde
 * [a-z0-9-] ile sinirlandirilmistir.
 */
const run = (commandLine, label) => {
  console.log("\n" + label);
  execSync(commandLine, { stdio: "inherit" });
};

// --- akis ---

const [briefPath, ...flags] = process.argv.slice(2);
if (!briefPath) fail("Kullanim: node scripts/produce.mjs <brief.json> [--no-render]");

const brief = readBrief(briefPath);
const videoDir = path.join("src", "videos", brief.slug);
const mediaDir = path.join("public", brief.slug);
fs.mkdirSync(videoDir, { recursive: true });
fs.mkdirSync(mediaDir, { recursive: true });

const paths = {
  audio: path.join(mediaDir, "vo.mp3"),
  captions: path.join(videoDir, "captions.json"),
  videoFile: path.join(videoDir, "video.ts"),
  output: path.join("out", brief.slug + ".mp4"),
};
const compositionId = toPascalCase(brief.slug);

console.log("\n== " + compositionId + " ==");

console.log("\n1/4 Seslendirme ve altyazi uretiliyor...");
const speechSeconds = synthesizeVoiceover(brief, paths);

console.log("\n2/4 Zamanlama ayarlaniyor...");
if (brief.autoFit !== false) fitScenesToSpeech(brief, speechSeconds);
checkTiming(brief, speechSeconds);

console.log("\n3/4 Video dosyasi yaziliyor...");
writeVideoFile(brief, paths, briefPath);
console.log("   " + paths.videoFile);
run("node scripts/build-registry.mjs", "   kayit defteri guncelleniyor...");

if (flags.includes("--no-render")) {
  console.log("\nRender atlandi. Onizleme: npm run dev -> " + compositionId);
  process.exit(0);
}

run("npx remotion render " + compositionId + " " + paths.output, "4/4 Render aliniyor...");
console.log("\nBitti: " + paths.output);
