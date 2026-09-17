/**
 * Telaffuz sozlugu: teknik kisaltmalarin seslendirmede nasil okunacagi.
 *
 * Sorun: edge-tts Turkce sesi "VRAM" yazisini "vıram" diye okur, "CPU"yu
 * "cupu" yapar. Cozum, seslendirme metnine okunusu yazmak ama altyazida
 * dogru yazimi gostermektir. produce.mjs anahtari degeriyle degistirip
 * tts.py'ye ters yonde bir --replace kurali verir; boylece kulak "vi ram"
 * duyar, ekranda "VRAM" yazar.
 *
 * Kurallar:
 *   - Anahtar buyuk/kucuk harf duyarli ve tam kelime olarak eslenir.
 *   - Uzun anahtar once uygulanir: "VRAM" islenmeden "RAM" devreye girmez.
 *   - Bir brief kendi "lexicon" alaniyla ekleme yapabilir veya bir girdiyi
 *     ezebilir; degeri null verilen anahtar o videoda devre disi kalir.
 */
export const lexicon = {
  // Bellek ve depolama
  VRAM: "vi ram",
  SSD: "es es de",
  HDD: "eyç di di",
  NVMe: "en vi em i",
  GB: "gigabayt",
  TB: "terabayt",
  MB: "megabayt",

  // Islemci ve ekran karti
  CPU: "si pi yu",
  GPU: "ci pi yu",
  APU: "ey pi yu",
  AMD: "ey em di",
  NVIDIA: "envidya",
  Nvidia: "envidya",
  RTX: "ar ti eks",
  GTX: "ci ti eks",
  GHz: "gigahertz",
  MHz: "megahertz",

  // Yapay zeka
  GPT: "ci pi ti",
  LLM: "el el em",
  API: "ey pi ay",
  OpenAI: "Open ey ay",

  // Baglanti ve arayuz
  USB: "yu es be",
  HDMI: "eyç di em ay",
  SATA: "sata",
  PCIe: "pi si ay i",
  RGB: "ar ci bi",
  OS: "o es",
  UI: "yu ay",
};

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Seslendirme metnindeki kisaltmalari okunuslariyla degistirir ve altyazinin
 * dogru yazima geri donmesi icin tts.py kurallarini uretir.
 *
 * @returns {{ narration: string, replace: string[] }}
 */
export const applyLexicon = (narration, overrides = {}) => {
  const merged = { ...lexicon, ...overrides };
  // Uzun anahtar once: "VRAM" degistirilmeden "RAM" eslesmemeli.
  const terms = Object.keys(merged)
    .filter((term) => merged[term])
    .sort((a, b) => b.length - a.length);

  let text = narration;
  const replace = [];

  for (const term of terms) {
    const pattern = new RegExp("\\b" + escapeRegExp(term) + "\\b", "g");
    if (!pattern.test(text)) continue;
    text = text.replace(pattern, merged[term]);
    replace.push(merged[term] + "=" + term);
  }

  return { narration: text, replace };
};
