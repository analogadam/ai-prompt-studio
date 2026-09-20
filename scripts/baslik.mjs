/**
 * Baslik kalibi: kanalin kazanan ve kaybeden basliklarini ayiran kural.
 *
 * Kanal verisi net: kazananlar soru ya da izleyiciye yonelik iddia, kaybedenler
 * urun duyurusu. "Amd islemci daha oyun odakli mi?" 1.916 izlenme aldi;
 * "GPT-6 Astra" 4, "Gemini Tum Sekmelere Erisim" 93 izlenme aldi. Konu yeni bir
 * urun olsa bile baslik duyuru gibi kurulmamali.
 *
 * Kural iki yerde gerekiyor -- YouTube adaylarini etiketlerken (discover.mjs) ve
 * radar onerilerini denetlerken (radar.mjs) -- bu yuzden kaynaktan bagimsiz
 * kendi modulunde durur.
 */
import { toTurkishLower, wordsPattern, WORD_START } from "./text.mjs";

// Soru eki ayri yazilir ("oyun odakli mi"), yani kelime olarak aranir.
const QUESTION = wordsPattern([
  "nasıl",
  "neden",
  "niçin",
  "niye",
  "kaç",
  "hangi",
  "ne kadar",
  "mı",
  "mi",
  "mu",
  "mü",
]);
const SECOND_PERSON = wordsPattern([
  "sen",
  "senin",
  "sana",
  "sakın",
  "yapma",
  "alma",
  "almayın",
  "dikkat",
  "bunu",
  "şunu",
]);
// "GPT-6", "RTX 5090", "Gemini 3": marka + surum kalibi.
const PRODUCT_NAME = new RegExp(WORD_START + "\\p{Lu}\\p{L}*[- ]?\\d", "u");

/**
 * Basligin kalibini isaretler: soru / iddia / duyuru / duz.
 *
 * Konuyu almadan once bakilacak ilk sey budur.
 */
export const titleShape = (title) => {
  // Desenler kucuk harfli; "YAPAY ZEKA MI" ancak boyle soru sayilir.
  const text = toTurkishLower(title);

  if (text.includes("?") || QUESTION.test(text)) return "soru";
  if (SECOND_PERSON.test(text)) return "iddia";
  // Urun kalibi buyuk harf arar, bu yuzden ham baslikta bakilir.
  if (PRODUCT_NAME.test(title)) return "duyuru";
  return "duz";
};

/** Kanal verisine gore tutan kaliplar. */
export const WINNING_SHAPES = new Set(["soru", "iddia"]);
