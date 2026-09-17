/**
 * Bir medya dosyasindan altyazi uretir (yerel Whisper.cpp, internet disinda ucret yok).
 *
 * Kullanim:
 *   node scripts/transcribe.mjs public/konusma.mp4
 *   node scripts/transcribe.mjs public/konusma.mp4 src/videos/konusma/captions.json
 *
 * Ortam degiskenleri:
 *   WHISPER_MODEL     tiny | base | small | medium | large-v3-turbo   (varsayilan: base)
 *   WHISPER_LANGUAGE  tr | en | ...                                    (varsayilan: tr)
 *
 * DIKKAT: Ilk calistirma agirdir -- Whisper.cpp kaynaktan derlenir (tum cekirdekleri
 * kullanir) ve model indirilir: base ~150 MB, medium ~1.5 GB. Sonrasi hizlidir.
 *
 * Seslendirmeyi scripts/tts.py uretiyorsa bu betik gerekmez; tts.py kelime
 * zamanlarini WordBoundary olaylarindan zaten cikarir. Burasi yalnizca disaridan
 * gelen hazir ses/video icindir.
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

const WHISPER_VERSION = "1.5.5";
const WHISPER_PATH = path.join(process.cwd(), "whisper.cpp");
const MODEL = process.env.WHISPER_MODEL ?? "base";
const LANGUAGE = process.env.WHISPER_LANGUAGE ?? "tr";

const [input, outputArg] = process.argv.slice(2);

if (!input) {
  console.error("Kullanim: node scripts/transcribe.mjs <medya-dosyasi> [cikti.json]");
  process.exit(1);
}

if (!fs.existsSync(input)) {
  console.error(`Dosya bulunamadi: ${input}`);
  process.exit(1);
}

const output =
  outputArg ??
  path.join("src", "videos", path.basename(input, path.extname(input)), "captions.json");

// Whisper.cpp yalnizca 16 kHz mono 16-bit WAV kabul eder.
const wavPath = path.join(os.tmpdir(), `remotion-transcribe-${Date.now()}.wav`);
console.log("1/4 Ses 16 kHz mono WAV'a cevriliyor...");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", input, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wavPath]);

console.log("2/4 Whisper.cpp hazirlaniyor...");
await installWhisperCpp({ to: WHISPER_PATH, version: WHISPER_VERSION });

console.log(`3/4 Model indiriliyor: ${MODEL}`);
await downloadWhisperModel({ model: MODEL, folder: WHISPER_PATH });

console.log(`4/4 Transkript cikariliyor (dil: ${LANGUAGE})...`);
const whisperCppOutput = await transcribe({
  inputPath: wavPath,
  whisperPath: WHISPER_PATH,
  whisperCppVersion: WHISPER_VERSION,
  model: MODEL,
  language: LANGUAGE,
  tokenLevelTimestamps: true,
});

const { captions } = toCaptions({ whisperCppOutput });

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(captions, null, 2), "utf8");
fs.rmSync(wavPath, { force: true });

const lastMs = captions.length ? captions[captions.length - 1].endMs : 0;
console.log(`\nBitti: ${output}`);
console.log(`${captions.length} kelime, ${(lastMs / 1000).toFixed(1)} saniye.`);
