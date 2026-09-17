/**
 * Telaffuz sozlugu: teknik kisaltmalarin ve yabanci kelimelerin seslendirmede
 * nasil okunacagi.
 *
 * Sorun: edge-tts Turkce sesi "VRAM" yazisini "viram" diye okur, "CPU"yu
 * "cupu", "gigabayt"i sert G ile soyler. Cozum, seslendirme metnine okunusu
 * yazmak ama altyazida dogru yazimi gostermektir. produce.mjs anahtari
 * degeriyle degistirip tts.py'ye ters yonde bir --replace kurali verir; boylece
 * kulak "vi ram" duyar, ekranda "VRAM" yazar.
 *
 * Kurallar:
 *   - Anahtar buyuk/kucuk harf duyarli ve tam kelime olarak eslenir.
 *   - Uzun anahtar once uygulanir: "VRAM" islenmeden "RAM" devreye girmez.
 *   - Turkce ekler korunur, okunusa tasinir (buildPattern'e bak).
 *   - Bir brief kendi "lexicon" alaniyla ekleme yapabilir veya bir girdiyi
 *     ezebilir; degeri null verilen anahtar o videoda devre disi kalir.
 */
import { escapeRegExp, WORD_END, WORD_START } from "./text.mjs";

export const lexicon = {
  // Bellek ve depolama
  VRAM: "vi ram",
  SSD: "es es di",
  HDD: "harddisk",
  NVMe: "en vi em i",
  DDR: "de de ar",
  GB: "cigabayt",
  TB: "terabayt",
  MB: "megabayt",

  // Islemci ve ekran karti
  CPU: "si pi yu",
  GPU: "ci pi yu",
  APU: "ey pi yu",
  AMD: "ey em di",
  NVIDIA: "envidya",
  Nvidia: "envidya",
  GeForce: "cifors",
  Ryzen: "rayzın",
  RTX: "ar ti eks",
  GTX: "ci ti eks",
  GHz: "cigahertz",
  MHz: "megahertz",

  // Yapay zeka
  GPT: "ci pi ti",
  ChatGPT: "çet ci pi ti",
  LLM: "el el em",
  API: "ey pi ay",
  AI: "ey ay",
  OpenAI: "Open ey ay",
  Gemini: "cemini",
  Claude: "klod",

  // Baglanti ve arayuz
  USB: "yu es bi",
  HDMI: "eyç di em ay",
  SATA: "sata",
  PCIe: "pi si ay i",
  RGB: "ar ci bi",
  OS: "o es",
  UI: "yu ay",

  // Marka ve urun adlari
  Google: "gugıl",
  YouTube: "yutup",
  Windows: "vindovs",

  // Cozunurluk: edge-tts "1080p"yi "bin seksen pe", "4K"yi "dort kagit" diye
  // okuyor. Okunuslar olculerek secildi (scripts/check-lexicon.mjs).
  "1080p": "bin seksen pi",
  "1440p": "bin dört yüz kırk pi",
  "4K": "dört kei",

  // Metinde acik yazilan olcu birimleri: Turkce'de "giga" yumusak soylenir,
  // edge-tts ise sert G ile okur.
  gigabayt: "cigabayt",
  gigabit: "cigabit",
  gigahertz: "cigahertz",
};

const HAS_UPPERCASE = /\p{Lu}/u;

/**
 * Terimin ekiyle birlikte eslenmesi icin desen kurar.
 *
 * Turkce'de ek almayan teknik metin yoktur: "VRAM'ı", "SSD'ler",
 * "gigabayttan", "1080p'de". Ek yok sayilirsa iki sey birden bozulur --
 * kisaltma ekinden kopuk okunur, altyazi da dogru yazima geri donemez.
 *
 * Buyuk harfli kisaltma ekini daima kesme isaretiyle alir; bu siki kural
 * "GB'lık" ile eslesip "GBit" ile eslesmemeyi saglar. Kucuk harfli ya da
 * rakamli terimde ek bitisik de olabilir kesmeli de ("gigabayttan",
 * "1080p'de"), cunku oradaki karisiklik riski yok.
 */
const buildPattern = (term) => {
  const suffix = HAS_UPPERCASE.test(term)
    ? "(?:['’](\\p{Ll}+))?"
    : "(?:['’]?(\\p{Ll}*))";
  return new RegExp(WORD_START + escapeRegExp(term) + suffix + WORD_END, "gu");
};

/**
 * Seslendirme metnindeki terimleri okunuslariyla degistirir ve altyazinin
 * dogru yazima geri donmesi icin tts.py kurallarini uretir.
 *
 * Kurallar gercekten yapilan degisikliklerden cikarilir: metinde "GB'ı"
 * geciyorsa kural "cigabaytı=GB'ı" olur, yalin "GB"ye ait kural degil.
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
  // Ayni okunusa birden fazla yazim dusebilir ("GB" ve "gigabayt"). Ses ayni
  // oldugu icin altyazi ikisini ayirt edemez; tek kural kalir ve kisa yazim
  // secilir -- Shorts ekraninda "8 GB", "8 gigabayt"tan iyi okunur.
  const rules = new Map();

  for (const term of terms) {
    text = text.replace(buildPattern(term), (match, suffix) => {
      const spoken = merged[term] + (suffix ?? "");
      const current = rules.get(spoken);
      if (current === undefined || match.length < current.length)
        rules.set(spoken, match);
      return spoken;
    });
  }

  return {
    narration: text,
    replace: [...rules].map(([spoken, written]) => spoken + "=" + written),
  };
};
