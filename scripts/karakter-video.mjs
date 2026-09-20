/**
 * Kameraya konusan karakter videosu uretir: kanca metni -> seslendirme ->
 * Wan 2.2 S2V dudak senkronu -> dikey mp4.
 *
 *   node scripts/karakter-video.mjs ses-duyacaksin
 *   node scripts/karakter-video.mjs ses-duyacaksin --seed 4 --steps 8
 *   node scripts/karakter-video.mjs ses-duyacaksin --boyut 640x1104
 *
 * Girdi: src/videos/<slug>/brief.json  (format: "karakter")
 *   {
 *     "slug": "ses-duyacaksin",
 *     "karakter": "ada",
 *     "narration": "Bir gun bir ses duyacaksin...",
 *     "hareket": "sakin konusma, hafif bas hareketi"   (istege bagli)
 *   }
 *
 * Cikti: out/<slug>.mp4 ve seslendirme public/<slug>/konusma.mp3
 *
 * Sure sesin uzunlugundan gelir: S2V 16 fps uretir ve kare sayisi 4n+1 olmali.
 * Model tek geciste 77 kare uretebildigi icin uzun video parcalara bolunur.
 *
 * Her parca AYRI bir ComfyUI isidir. Bir is bitince iki sey kalir: o parcanin
 * mp4'u (out/parcalar/<slug>/pNN.mp4) ve o ana kadar biriken latent. Sonraki is
 * latenti LoadLatent ile geri yukleyip kaldigi yerden devam eder. Bu kayipsiz:
 * Extend dugumu gelen latentin yalnizca son 19 karesini hareket referansi olarak
 * kullaniyor, geri kalanini da ses ofsetini (kare_sayisi * 4) bulmak icin.
 * Tek ise sigdirmaya calismak yerine bolmenin iki kazanci var: bellek parca
 * basina sabit kaliyor ve yarida kesilen uretim bastan baslamiyor.
 *
 * Parcalar sonunda ffmpeg ile tek geciste birlestirilir, ses o adimda bindirilir.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { applyLexicon } from "./lexicon.mjs";
import {
  freeMemory,
  hasInput,
  loadWorkflow,
  runWorkflow,
  setInput,
  stageInput,
  stageOutput,
} from "./comfy.mjs";

const PYTHON = process.env.PYTHON ?? "python";
const KARAKTER_DIR = "karakterler";
const VIDEO_DIR = "src/videos";
const PUBLIC_DIR = "public";
const OUT_DIR = "out";
const PART_DIR = "out/parcalar";

const FPS = 16;
// Modelin egitildigi parca uzunlugu. Uzun video tek gecisle uretilemiyor.
const CHUNK = 77;
const MIN_CHUNK = 5;

/**
 * Uretim olcusu. Shorts ciktisi her halukarda 1080x1920'ye buyutulur.
 * 480x832 olculdu ve birakildi: o olcude agiz birkac piksel kaliyor, dudak
 * cizgisi ve disler kayboluyor. 640x1104 maliyeti tam iki katina cikariyor
 * ama hem goruntu netligini hem dudak senkronu algisini duzeltiyor.
 */
const GENISLIK = 640;
const YUKSEKLIK = 1104;
const CIKTI_GENISLIK = 1080;
const CIKTI_YUKSEKLIK = 1920;

/** Wan icin standart olumsuz istem; asiri doygunluk ve bozuk el uretimini kirar. */
const KUSURLAR =
  "renkli asiri doygun, statik, detaysiz, gri, en kotu kalite, dusuk kalite, " +
  "JPEG bozulmasi, cirkin, sakat, fazla parmak, kotu cizilmis el, deforme yuz, " +
  "altyazi, yazi, filigran, hareketsiz goruntu, geriye dogru yurume";

const VARSAYILAN_HAREKET =
  "she is talking directly to the camera, natural lip sync, subtle head movement, " +
  "slight blinking, handheld phone selfie video, stable framing";

const fail = (message) => {
  console.error("\nHATA: " + message + "\n");
  process.exit(1);
};

const readFlag = (args, name, fallback) => {
  const index = args.indexOf("--" + name);
  return index === -1 ? fallback : args[index + 1];
};

const readJson = (file, what) => {
  if (!fs.existsSync(file)) fail(what + " bulunamadi: " + file);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(what + " gecerli JSON degil: " + error.message);
  }
};

const pad2 = (sayi) => String(sayi).padStart(2, "0");

/** index numarali parcayi uretmek icin gereken latent: bir onceki parcanin biriktirdigi. */
const latentAdi = (slug, index) => slug + "-p" + pad2(index) + ".latent";

/** Dugumu basligindan bulur; kimlik numaralari degisse de betik bozulmasin diye. */
const idOf = (workflow, title) =>
  Object.keys(workflow).find((key) => workflow[key]._meta?.title === title);

const addNode = (workflow, id, classType, title, inputs) => {
  workflow[id] = { class_type: classType, _meta: { title }, inputs };
  return [id, 0];
};

/**
 * edge-tts ile seslendirir; konusma suresini saniye olarak dondurur.
 * Altyazi dosyasi bu formatta ekranda kullanilmiyor ama tts.py uretiyor;
 * gecici klasore yazilip birakiliyor.
 */
const synthesize = (brief, karakter, audioPath) => {
  const spoken = applyLexicon(brief.narration, brief.lexicon);
  if (spoken.replace.length > 0) {
    console.log("   telaffuz : " + spoken.replace.map((rule) => rule.split("=")[1]).join(", "));
  }

  const textFile = path.join(os.tmpdir(), "karakter-" + brief.slug + "-" + Date.now() + ".txt");
  fs.writeFileSync(textFile, spoken.narration, "utf8");

  const args = [
    "scripts/tts.py",
    "--text-file",
    textFile,
    "--audio-out",
    audioPath,
    "--captions-out",
    path.join(os.tmpdir(), "karakter-" + brief.slug + ".captions.json"),
    "--voice",
    brief.voice ?? karakter.ses ?? "tr-TR-EmelNeural",
    "--rate",
    brief.rate ?? karakter.rate ?? "+0%",
  ];
  for (const rule of [...spoken.replace, ...(brief.replace ?? [])]) args.push("--replace", rule);

  let output;
  try {
    output = execFileSync(PYTHON, args, { encoding: "utf8" });
  } catch (error) {
    fail(
      "Seslendirme basarisiz. edge_tts kurulu bir Python gerekli.\n" +
        "Denenen yorumlayici: " +
        PYTHON +
        "\n" +
        (error.stderr ?? error.message),
    );
  } finally {
    fs.rmSync(textFile, { force: true });
  }

  const match = output.match(/speechEndMs=(\d+)/);
  if (!match) fail("tts.py konusma suresini bildirmedi:\n" + output);
  return Number(match[1]) / 1000;
};

/** S2V yalnizca 4n+1 kare uretebiliyor. */
const align = (frames) => Math.ceil((frames - 1) / 4) * 4 + 1;

/** Wan VAE'sinde bir latent karesi 4 goruntu karesine aciliyor. */
const latentFrames = (frames) => Math.floor((frames - 1) / 4) + 1;

/**
 * Sesin uzunlugunu parcalara boler. Ilk parca sahneyi kurar, sonrakiler
 * onceki parcanin latent'inden devam eder; ses her parcada kaldigi yerden
 * okunur, o yuzden konusma kesintisiz akar.
 */
const planChunks = (seconds) => {
  const chunks = [];
  let left = align(Math.ceil(seconds * FPS) + 1);

  while (left > 0) {
    const take = left > CHUNK ? CHUNK : Math.max(MIN_CHUNK, align(left));
    chunks.push(take);
    left -= take;
  }
  return chunks;
};

/**
 * Tek bir parcanin is akisini kurar.
 *
 * Ilk parca sahneyi sifirdan kurar. Sonrakiler onceki latenti yukleyip Extend
 * ile devam eder. Iki yerde baglam farki var:
 *  - Coz baglami: VAE ilk latent karesini tek goruntuye aciyor, sonrakileri
 *    dorde. Parcanin onune bir latent karesi konup acildiktan sonra atiliyor ki
 *    parca sinirinda sicrama olmasin. Ilk parcada o kare kendi ilk karesinin
 *    kopyasi (3 kare atilir), sonrakilerde oncekinin son karesi (1 kare atilir).
 *  - Ses ofseti: Extend dugumu ofseti gelen latentin uzunlugundan turetiyor,
 *    o yuzden biriken latentin tamami tasiniyor, yalnizca kuyrugu degil.
 */
const buildChunkWorkflow = (plan) => {
  const { index, chunks, brief, slug, referans, audioPath, seed, steps } = plan;
  const workflow = loadWorkflow("karakter-konusma.api.json");
  const part = pad2(index + 1);

  setInput(workflow, "referans", "image", stageInput(referans));
  setInput(workflow, "ses", "audio", stageInput(audioPath));
  setInput(workflow, "olumlu", "text", brief.hareket ?? VARSAYILAN_HAREKET);
  setInput(workflow, "olumsuz", "text", KUSURLAR);
  setInput(workflow, "ornekleyici", "seed", seed);
  setInput(workflow, "ornekleyici", "steps", steps);
  // Ses gomulmesi olumluya, sifirlanmis hali olumsuza yaziliyor; dudak hareketi
  // ikisi arasindaki farkin cfg ile buyutulmesinden geliyor. cfg 1.0'da olumsuz
  // dal hic hesaplanmadigi icin senkron zayifliyor. cfg'yi yukseltmek hizlandirici
  // loranin gucunu dusurmeyi gerektiriyor: lora cfg 1.0 icin damitilmis.
  setInput(workflow, "ornekleyici", "cfg", plan.cfg);
  setInput(workflow, "hizlandirici", "strength_model", plan.lora);
  setInput(workflow, "birlestir", "filename_prefix", "karakter-" + slug + "-p" + part);
  // Ses parcalarin uzerine sonda tek seferde biniyor; parca dosyalari sessiz.
  delete workflow[idOf(workflow, "birlestir")].inputs.audio;

  let biriken;
  if (index === 0) {
    setInput(workflow, "sahne", "width", plan.genislik);
    setInput(workflow, "sahne", "height", plan.yukseklik);
    setInput(workflow, "sahne", "length", chunks[0]);

    biriken = ["13", 0];
    setInput(workflow, "ilk-kare", "samples", ["13", 0]);
    setInput(workflow, "ilk-kare", "index", 0);
    setInput(workflow, "basi-kirp", "batch_index", 3);
  } else {
    delete workflow[idOf(workflow, "sahne")];

    addNode(workflow, "200", "LoadLatent", "onceki", { latent: plan.prevLatent });
    addNode(workflow, "201", "WanSoundImageToVideoExtend", "uzat", {
      positive: ["6", 0],
      negative: ["7", 0],
      vae: ["5", 0],
      length: chunks[index],
      video_latent: ["200", 0],
      audio_encoder_output: ["11", 0],
      ref_image: ["8", 0],
    });

    setInput(workflow, "ornekleyici", "positive", ["201", 0]);
    setInput(workflow, "ornekleyici", "negative", ["201", 1]);
    setInput(workflow, "ornekleyici", "latent_image", ["201", 2]);

    biriken = addNode(workflow, "202", "LatentConcat", "birikim", {
      samples1: ["200", 0],
      samples2: ["13", 0],
      dim: "t",
    });

    setInput(workflow, "ilk-kare", "samples", ["200", 0]);
    setInput(workflow, "ilk-kare", "index", -1);
    setInput(workflow, "basi-kirp", "batch_index", 1);
  }
  setInput(workflow, "son-latent", "samples2", ["13", 0]);

  // Son parcadan sonra devam edilecek bir sey yok.
  if (plan.saveLatent) {
    addNode(workflow, "203", "SaveLatent", "durum", {
      samples: biriken,
      filename_prefix: "latents/" + slug + "-p" + part,
    });
  }
  return workflow;
};

/**
 * Parcalari tek geciste birlestirir, sesi bindirir ve Shorts olcusune buyutur.
 *
 * RIFE bir parcadaki N kareyi 2N-1 kareye cikariyor, yani her parca bir kare
 * eksik bitiyor. Son parca disindaki her parcanin son karesi kopyalanarak
 * (tpad) bu kapatiliyor; aksi halde kaybolan kareler birikip sesle goruntu
 * arasini parca sayisi kadar kare aciyor.
 */
const assemble = (parts, audioPath, target) => {
  const last = parts.length - 1;
  const steps = parts.map((_, i) =>
    i === last ? "[" + i + ":v]null[v" + i + "]" : "[" + i + ":v]tpad=stop=1:stop_mode=clone[v" + i + "]",
  );
  const chain = parts.map((_, i) => "[v" + i + "]").join("");
  const filter =
    steps.join(";") +
    ";" +
    chain +
    "concat=n=" +
    parts.length +
    ":v=1:a=0,scale=" +
    CIKTI_GENISLIK +
    ":" +
    CIKTI_YUKSEKLIK +
    ":flags=lanczos[cikti]";

  fs.mkdirSync(path.dirname(target), { recursive: true });
  try {
    execFileSync(
      "ffmpeg",
      // prettier-ignore
      [
        "-loglevel", "error", "-y",
        ...parts.flatMap((file) => ["-i", file]),
        "-i", audioPath,
        "-filter_complex", filter,
        "-map", "[cikti]", "-map", parts.length + ":a",
        "-c:v", "libx264", "-crf", "17", "-preset", "medium", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        target,
      ],
      { encoding: "utf8" },
    );
  } catch (error) {
    fail("ffmpeg birlestirme basarisiz:\n" + (error.stderr ?? error.message));
  }
};

const main = async () => {
  const args = process.argv.slice(2);
  const slug = args[0];
  if (!slug || slug.startsWith("--")) {
    fail("Kullanim: node scripts/karakter-video.mjs <video-slug> [--seed N] [--steps N] [--boyut 480x832]");
  }

  const brief = readJson(path.join(VIDEO_DIR, slug, "brief.json"), "Brief");
  if (!brief.narration) fail("Brief icinde narration alani eksik");
  if (!brief.karakter) fail('Brief icinde karakter alani eksik (ornek: "karakter": "ada")');

  const karakterDir = path.join(KARAKTER_DIR, brief.karakter);
  const karakter = readJson(path.join(karakterDir, "karakter.json"), "Karakter tanimi");
  const referans = path.join(karakterDir, "referans.png");
  if (!fs.existsSync(referans)) {
    fail(
      "Karakterin referans karesi yok: " +
        referans +
        "\nOnce uretin: node scripts/karakter-portre.mjs " +
        brief.karakter,
    );
  }

  const [genislik, yukseklik] = readFlag(args, "boyut", GENISLIK + "x" + YUKSEKLIK)
    .split("x")
    .map(Number);
  if (!genislik || !yukseklik) fail("--boyut olcusu GENISLIKxYUKSEKLIK biciminde olmali");

  const seed = Number(readFlag(args, "seed", brief.seed ?? 1));
  // Uretim ayari. cfg 1.0 ses kilavuzunu tamamen kapatiyor (olumsuz dal hic
  // hesaplanmiyor), dudak senkronu orada oluyor; hiz lorasi da cfg 1.0 icin
  // damitildigi icin ikisi birlikte degisiyor.
  const steps = Number(readFlag(args, "steps", 10));
  const cfg = Number(readFlag(args, "cfg", brief.cfg ?? 4.5));
  const lora = Number(readFlag(args, "lora", brief.lora ?? 0.4));

  fs.mkdirSync(path.join(PUBLIC_DIR, slug), { recursive: true });
  const audioPath = path.join(PUBLIC_DIR, slug, "konusma.mp3");

  console.log("Video    : " + slug);
  console.log("Karakter : " + karakter.ad + " (" + referans + ")");
  const seconds = synthesize(brief, karakter, audioPath);

  const chunks = planChunks(seconds);
  const frames = chunks.reduce((total, length) => total + length, 0);
  const kareler = 4 * chunks.reduce((total, length) => total + latentFrames(length), 0) - 2;
  console.log(
    "   ses    : " +
      seconds.toFixed(1) +
      " sn -> " +
      frames +
      " kare, " +
      chunks.length +
      " parca (" +
      chunks.join("+") +
      ")",
  );
  console.log(
    "   olcu   : " +
      genislik +
      "x" +
      yukseklik +
      ", " +
      steps +
      " adim, cfg " +
      cfg +
      ", lora " +
      lora +
      ", tohum " +
      seed,
  );

  // Ayarlarin biri degistiyse yarim kalan parcalar artik gecerli degil.
  const partDir = path.join(PART_DIR, slug);
  const durumFile = path.join(partDir, "durum.json");
  const imza = JSON.stringify({
    narration: brief.narration,
    ses: brief.voice ?? karakter.ses,
    rate: brief.rate ?? karakter.rate,
    hareket: brief.hareket ?? VARSAYILAN_HAREKET,
    chunks,
    seed,
    steps,
    cfg,
    lora,
    genislik,
    yukseklik,
  });

  const durum = fs.existsSync(durumFile) ? readJson(durumFile, "Parca durumu") : null;
  if (!durum || durum.imza !== imza) fs.rmSync(partDir, { recursive: true, force: true });
  fs.mkdirSync(partDir, { recursive: true });

  const parts = chunks.map((_, index) => path.join(partDir, "p" + pad2(index + 1) + ".mp4"));

  // Nereden devam edilecegi diske bakilarak bulunur: bastan itibaren kesintisiz
  // duran parcalar gecerli, ilk bosluktan sonrasi yeniden uretilir. Bir parcayi
  // uretmek icin bir oncekinin latenti de duruyor olmali.
  let hazir = 0;
  while (hazir < parts.length && fs.existsSync(parts[hazir])) hazir += 1;

  if (hazir > 0 && hazir < parts.length && !hasInput(latentAdi(slug, hazir))) {
    console.log("   uyari  : " + latentAdi(slug, hazir) + " yok, parcalar bastan uretilecek");
    hazir = 0;
  }
  if (hazir > 0) console.log("   devam  : " + hazir + " parca hazir, kalanlar uretilecek");

  let gecen = 0;
  let uretilen = 0;
  for (let index = 0; index < chunks.length; index += 1) {
    const part = parts[index];
    if (index < hazir) continue;

    const saveLatent = index < chunks.length - 1;
    const workflow = buildChunkWorkflow({
      index,
      chunks,
      brief,
      slug,
      referans,
      audioPath,
      seed,
      steps,
      cfg,
      lora,
      genislik,
      yukseklik,
      prevLatent: latentAdi(slug, index),
      saveLatent,
    });

    const etiket = "parca " + (index + 1) + "/" + chunks.length + " (" + chunks[index] + " kare)";
    await freeMemory();
    const { seconds: sure, outputs } = await runWorkflow(workflow, part, etiket);
    gecen += sure;
    uretilen += 1;

    if (saveLatent) {
      await stageOutput(workflow, outputs, "durum", latentAdi(slug, index + 1));
    }
    fs.writeFileSync(durumFile, JSON.stringify({ imza }, null, 2), "utf8");

    const kalan = chunks.length - index - 1;
    console.log(
      "  " +
        etiket +
        " bitti: " +
        sure.toFixed(0) +
        " sn" +
        (kalan > 0 ? "  (kalan ~" + (((gecen / uretilen) * kalan) / 60).toFixed(0) + " dk)" : ""),
    );
  }

  const target = path.join(OUT_DIR, slug + ".mp4");
  assemble(parts, audioPath, target);

  console.log(
    "Hazir    : " +
      target +
      "  (" +
      (kareler / FPS).toFixed(1) +
      " sn, " +
      (gecen / 60).toFixed(0) +
      " dk render)",
  );
  console.log("Kontrol  : node scripts/transcribe.mjs " + target);
};

main();
