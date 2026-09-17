/**
 * Telaffuz sozlugunu gercek bir konusma tanima modeliyle sinar.
 *
 *   node scripts/check-lexicon.mjs
 *   node scripts/check-lexicon.mjs --terms SSD,HDD,USB
 *   node scripts/check-lexicon.mjs --voice tr-TR-EmelNeural
 *
 * Neden: "SSD nasil okunur" sorusunun cevabi tahmine birakilamaz. Yontem
 * soyle -- sozlukteki okunus edge-tts ile seslendirilir, cikan ses Whisper'a
 * (Turkce) dinletilir, Whisper ne yazdigina bakilir. Whisper gercek insan
 * kayitlariyla egitildigi icin, okunus dogruysa kisaltmayi tanir:
 *
 *   "es es di"  -> Whisper: "SSD"       ✓ okunus gercek kullanima uyuyor
 *   "es es de"  -> Whisper: "S-S-D-E"   ✗ boyle soylenmiyor
 *
 * Bu bir kanit degil, kuvvetli bir isarettir: model tanimiyorsa okunus ya
 * yanlistir ya da az kullanilir. Karar yine insana ait, betik yalnizca
 * hangilerine bakilmasi gerektigini soyler.
 *
 * DIKKAT: Ilk calistirma agirdir -- Whisper.cpp kaynaktan derlenir ve model
 * indirilir (base ~150 MB). Sonraki calistirmalar hizlidir.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  downloadWhisperModel,
  installWhisperCpp,
  toCaptions,
  transcribe,
} from "@remotion/install-whisper-cpp";
import { lexicon } from "./lexicon.mjs";
import { toTurkishLower } from "./text.mjs";

const PYTHON = process.env.PYTHON ?? "python";
const WHISPER_VERSION = "1.5.5";
const WHISPER_PATH = path.join(process.cwd(), "whisper.cpp");
const MODEL = process.env.WHISPER_MODEL ?? "base";
const DEFAULT_VOICE = "tr-TR-AhmetNeural";

const readFlag = (name) => {
  const index = process.argv.indexOf("--" + name);
  return index === -1 ? undefined : process.argv[index + 1];
};

/** Karsilastirma icin harf ve rakam disindaki her seyi atar. */
const bareForm = (text) => toTurkishLower(text).replace(/[^\p{L}\p{N}]/gu, "");

/** Okunusu seslendirip 16 kHz mono WAV dondurur (Whisper yalnizca bunu kabul eder). */
const synthesize = (reading, voice, workDir, index) => {
  const textFile = path.join(workDir, index + ".txt");
  const mp3 = path.join(workDir, index + ".mp3");
  const wav = path.join(workDir, index + ".wav");

  fs.writeFileSync(textFile, reading, "utf8");
  execFileSync(PYTHON, [
    "scripts/tts.py",
    "--text-file",
    textFile,
    "--audio-out",
    mp3,
    "--captions-out",
    path.join(workDir, index + ".json"),
    "--voice",
    voice,
    "--rate",
    "+0%",
  ]);
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    mp3,
    "-ar",
    "16000",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    wav,
  ]);

  return wav;
};

const listen = async (wav) => {
  const whisperCppOutput = await transcribe({
    inputPath: wav,
    whisperPath: WHISPER_PATH,
    whisperCppVersion: WHISPER_VERSION,
    model: MODEL,
    language: "tr",
    tokenLevelTimestamps: false,
  });

  const { captions } = toCaptions({ whisperCppOutput });
  return captions
    .map((caption) => caption.text)
    .join("")
    .trim();
};

// --- akis ---

const voice = readFlag("voice") ?? DEFAULT_VOICE;
const only = readFlag("terms")
  ?.split(",")
  .map((term) => term.trim())
  .filter(Boolean);

const entries = Object.entries(lexicon).filter(
  ([term, reading]) => reading && (!only || only.includes(term)),
);
if (entries.length === 0) {
  console.error("\nHATA: sinanacak terim yok.\n");
  process.exit(1);
}

console.log(
  "\n== Telaffuz denetimi ==\n   ses: " +
    voice +
    " | model: " +
    MODEL +
    " | terim: " +
    entries.length +
    "\n",
);

console.log("Whisper.cpp hazirlaniyor (ilk calistirma uzun surer)...");
await installWhisperCpp({ to: WHISPER_PATH, version: WHISPER_VERSION });
await downloadWhisperModel({ model: MODEL, folder: WHISPER_PATH });

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "lexicon-"));
const results = [];

try {
  for (const [index, [term, reading]] of entries.entries()) {
    const heard = await listen(synthesize(reading, voice, workDir, index));
    results.push({
      term,
      reading,
      heard,
      ok: bareForm(heard) === bareForm(term),
    });
    process.stdout.write(".");
  }
} finally {
  fs.rmSync(workDir, { recursive: true, force: true });
}

const column = (text, width) => String(text).padEnd(width).slice(0, width);

console.log("\n\n  terim      okunus            Whisper ne duydu");
console.log("  " + "-".repeat(70));
for (const { term, reading, heard, ok } of results) {
  console.log(
    "  " + (ok ? "+ " : "! ") + column(term, 9) + column(reading, 18) + heard,
  );
}

const failed = results.filter((result) => !result.ok);
console.log(
  "\n" +
    (results.length - failed.length) +
    "/" +
    results.length +
    " terim tanindi." +
    (failed.length
      ? " Bakilacaklar: " + failed.map((result) => result.term).join(", ")
      : ""),
);
