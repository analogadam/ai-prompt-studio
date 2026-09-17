/**
 * Turkce metinde kelime siniri.
 *
 * JavaScript'in \b sinir kontrolu ASCII'ye gore calisir: "ı", "ş", "ğ" gibi
 * harfleri harf saymaz. Bu yuzden "VRAM'ı" ya da "oyun odaklı mı" gibi
 * ifadelerde \b sessizce yanlis sonuc verir -- desen hic eslesmez. Sinir bu
 * yuzden "harf ya da rakam gelmiyor" kosuluyla kurulur (u bayragi sart).
 */
export const WORD_START = "(?<![\\p{L}\\p{N}_])";
export const WORD_END = "(?![\\p{L}\\p{N}_])";

/** Desen icinde gecen ozel karakterleri etkisiz hale getirir. */
export const escapeRegExp = (text) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Turkce'ye gore kucuk harf.
 *
 * Regex'in "i" bayragi Unicode katlamasi yapar ve Turkce'de yanilir: "I"
 * harfini "i"ye cevirir, oysa dogrusu "ı"dir. Bu yuzden "EKRAN KARTLARI"
 * basligi "ekran kartları" terimiyle eslesmez. Cozum, metni ve desenleri
 * Turkce kurallariyla kucultup buyuk/kucuk harf duyarli eslestirmektir.
 */
export const toTurkishLower = (text) => text.toLocaleLowerCase("tr");

/**
 * Verilen kelimelerden birini tam kelime olarak arayan desen.
 *
 * Duz metin aramasi ("icerir") kisa terimlerde yaniltiyor: "ram" kelimesi
 * "program" icinde, "model" kelimesi "modelleme" icinde eslesir.
 *
 * Desen kucuk harflidir; aranan metin de toTurkishLower'dan gecirilmelidir.
 */
export const wordsPattern = (words) =>
  new RegExp(
    WORD_START +
      "(?:" +
      words.map((word) => escapeRegExp(toTurkishLower(word))).join("|") +
      ")" +
      WORD_END,
    "u",
  );

/**
 * Sik kullanilan Turkce cekim ekleri, uzundan kisaya.
 *
 * Tam liste degil; amac "ekran kartlari" ile "ekran karti"yi ayni terime
 * baglamak. Uzun olan once denenir, yoksa "kartlari" icindeki "lar" eslesip
 * geri kalan harfler kelime sinirini bozar.
 */
const SUFFIXES = [
  "larını",
  "lerini",
  "ların",
  "lerin",
  "ları",
  "leri",
  "lar",
  "ler",
  "sının",
  "sinin",
  "ının",
  "inin",
  "unun",
  "ünün",
  "nın",
  "nin",
  "nun",
  "nün",
  "ını",
  "ini",
  "unu",
  "ünü",
  "sı",
  "si",
  "su",
  "sü",
  "lık",
  "lik",
  "luk",
  "lük",
  "cı",
  "ci",
  "cu",
  "cü",
  "dan",
  "den",
  "tan",
  "ten",
  "da",
  "de",
  "ta",
  "te",
  "yla",
  "yle",
  "la",
  "le",
  "ya",
  "ye",
  "yı",
  "yi",
  "yu",
  "yü",
  "ın",
  "in",
  "un",
  "ün",
  "ı",
  "i",
  "u",
  "ü",
  "a",
  "e",
];

/**
 * Terim listesini ekleriyle birlikte arayan desen.
 *
 * Turkce metinde terim ciplak gecmez: "ekran kartlari", "RAM'i", "GPU'yu".
 * Terimler govde olarak yazilir ("ekran kart"), ek desende karsilanir.
 * Rastgele harf dizisi kabul edilmez; "ram" terimi "ramazan" ile eslesmez,
 * cunku "azan" ek listesinde yok.
 *
 * Desen kucuk harflidir; aranan metin de toTurkishLower'dan gecirilmelidir.
 */
export const termsPattern = (stems) =>
  new RegExp(
    WORD_START +
      "(?:" +
      stems.map((stem) => escapeRegExp(toTurkishLower(stem))).join("|") +
      ")" +
      "(?:['’]?(?:" +
      SUFFIXES.join("|") +
      "))?" +
      WORD_END,
    "u",
  );
